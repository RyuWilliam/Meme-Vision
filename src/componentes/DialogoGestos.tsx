// DialogoGestos — la vista de reconocimiento en vivo, como componente React.
//
// Es la parte más delicada del port: aquí vive la cámara, el bucle de
// requestAnimationFrame y MediaPipe. La lógica de visión NO se reescribió: se
// sigue usando MotorGestos, Estabilizador y urlMeme tal cual.
//
// Lo único que cambia respecto a ui-gestos.ts es QUIÉN es dueño del DOM: allí
// se buscaban elementos con querySelector y se escribía en ellos; aquí los
// elementos los pinta React y se guardan en refs para que la lógica imperativa
// (video, canvas, MediaPipe) los use directamente.
import { useCallback, useEffect, useRef, useState } from 'react'
import { abrirCamara, contarCamaras, describirErrorCamara, detenerFlujo, estadoPermiso } from '../dispositivo'
import { Estabilizador } from '../vision/estabilizador'
import { urlMeme } from '../vision/memes'
import { MotorGestos } from '../vision/motor'
import { GESTOS } from '../vision/tipos'
import type { DeteccionGesto, EntradaCuadro, GestoId } from '../vision/tipos'
import { Icono } from './Icono'

const CONEXIONES_MANO: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
]

const PUNTOS_ROSTRO_DEBUG = [10, 13, 14, 152, 172, 397]

/** Cada cuánto se ejecuta una inferencia, como máximo (ms). */
const INTERVALO_INFERENCIA = 65

interface Props {
  alCerrar: () => void
}

export function DialogoGestos({ alCerrar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const marco = useRef<HTMLDivElement>(null)
  const botonIniciar = useRef<HTMLButtonElement>(null)

  const [gesto, setGesto] = useState<GestoId>('ninguno')
  const [meme, setMeme] = useState(() => urlMeme('ninguno'))
  const [confianza, setConfianza] = useState(0)
  const [estado, setEstado] = useState('Pulsa «Activar cámara» cuando quieras empezar. La cámara no se abre sola.')
  const [detalleMotor, setDetalleMotor] = useState('Motor: —')
  const [camaraActiva, setCamaraActiva] = useState(false)
  const [puntos, setPuntos] = useState(false)
  const [hayVariasCamaras, setHayVariasCamaras] = useState(false)

  // Todo lo que no debe provocar un render vive en refs: el stream, el motor de
  // visión, el identificador del bucle y los temporizadores.
  const stream = useRef<MediaStream | null>(null)
  const motor = useRef<MotorGestos | null>(null)
  const animacion = useRef(0)
  const ultimaInferencia = useRef(0)
  const ultimoFotograma = useRef(0)
  const estabilizador = useRef(new Estabilizador())
  const facing = useRef<'user' | 'environment'>('user')
  const iniciando = useRef(false)
  const puntosRef = useRef(false)

  // El lienzo de depuración se lee desde el bucle sin reiniciarlo.
  const debug = useCallback((valor: boolean) => {
    puntosRef.current = valor
    setPuntos(valor)
    const ctx = lienzo.current?.getContext('2d')
    if (!valor && ctx && lienzo.current) {
      ctx.clearRect(0, 0, lienzo.current.width, lienzo.current.height)
    }
  }, [])

  const ajustarLienzo = useCallback(() => {
    const videoEl = video.current
    const marcoEl = marco.current
    const lienzoEl = lienzo.current
    if (!videoEl || !marcoEl || !lienzoEl) return
    if (!videoEl.videoWidth || !videoEl.videoHeight) return

    // El video se muestra con object-fit: contain. El lienzo tiene que ocupar
    // exactamente el rectángulo que dibuja el video, o los puntos se desalinean.
    const anchoMarco = marcoEl.clientWidth
    const altoMarco = marcoEl.clientHeight
    const escala = Math.min(anchoMarco / videoEl.videoWidth, altoMarco / videoEl.videoHeight)
    const ancho = videoEl.videoWidth * escala
    const alto = videoEl.videoHeight * escala
    lienzoEl.style.width = `${ancho}px`
    lienzoEl.style.height = `${alto}px`
    lienzoEl.style.left = `${(anchoMarco - ancho) / 2}px`
    lienzoEl.style.top = `${(altoMarco - alto) / 2}px`
    lienzoEl.style.right = 'auto'
    lienzoEl.style.bottom = 'auto'
  }, [])

  const pintarCuadro = useCallback((entrada: EntradaCuadro) => {
    const lienzoEl = lienzo.current
    const ctx = lienzoEl?.getContext('2d')
    if (!lienzoEl || !ctx) return

    ctx.clearRect(0, 0, lienzoEl.width, lienzoEl.height)
    if (!puntosRef.current) return

    const ancho = lienzoEl.width
    const alto = lienzoEl.height
    const punto = (x: number, y: number) => [x * ancho, y * alto] as const

    if (entrada.mano) {
      ctx.lineWidth = Math.max(2, ancho * 0.003)
      ctx.strokeStyle = 'rgba(216, 250, 114, .8)'
      ctx.beginPath()
      for (const [a, b] of CONEXIONES_MANO) {
        const [ax, ay] = punto(entrada.mano[a].x, entrada.mano[a].y)
        const [bx, by] = punto(entrada.mano[b].x, entrada.mano[b].y)
        ctx.moveTo(ax, ay)
        ctx.lineTo(bx, by)
      }
      ctx.stroke()

      for (let i = 0; i < entrada.mano.length; i++) {
        const [x, y] = punto(entrada.mano[i].x, entrada.mano[i].y)
        ctx.beginPath()
        ctx.arc(x, y, i === 8 ? ancho * 0.012 : ancho * 0.007, 0, Math.PI * 2)
        ctx.fillStyle = i === 8 ? '#ffcfbd' : '#d8fa72'
        ctx.fill()
      }
    }

    if (entrada.rostro) {
      ctx.fillStyle = '#ffcfbd'
      for (const i of PUNTOS_ROSTRO_DEBUG) {
        const [x, y] = punto(entrada.rostro[i].x, entrada.rostro[i].y)
        ctx.beginPath()
        ctx.arc(x, y, ancho * 0.006, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.strokeStyle = 'rgba(255, 207, 189, .55)'
      ctx.lineWidth = Math.max(1, ancho * 0.002)
      for (const [a, b] of [[172, 152], [397, 152]] as Array<[number, number]>) {
        const [ax, ay] = punto(entrada.rostro[a].x, entrada.rostro[a].y)
        const [bx, by] = punto(entrada.rostro[b].x, entrada.rostro[b].y)
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(bx, by)
        ctx.stroke()
      }
    }
  }, [])

  const aplicarGesto = useCallback((nuevo: GestoId) => {
    setGesto(nuevo)
    if (nuevo === 'ninguno') {
      setMeme(urlMeme('ninguno'))
      return
    }
    setMeme(urlMeme(nuevo))
  }, [])

  const detenerCamara = useCallback(() => {
    cancelAnimationFrame(animacion.current)
    animacion.current = 0
    detenerFlujo(stream.current)
    stream.current = null
    if (video.current) video.current.srcObject = null
    const lienzoEl = lienzo.current
    const ctx = lienzoEl?.getContext('2d')
    if (lienzoEl && ctx) ctx.clearRect(0, 0, lienzoEl.width, lienzoEl.height)
    estabilizador.current.reiniciar()
    setMeme(urlMeme('ninguno'))
    setGesto('ninguno')
    setConfianza(0)
    setCamaraActiva(false)
    if (botonIniciar.current) {
      botonIniciar.current.textContent = 'Activar cámara'
      botonIniciar.current.disabled = false
    }
  }, [])

  /** El bucle de inferencia. Igual que el de ui-gestos.ts, con el mismo throttle. */
  const iniciarBucle = useCallback(() => {
    cancelAnimationFrame(animacion.current)
    ultimaInferencia.current = 0

    const bucle = (ahora: number) => {
      const dialogoEl = dialogo.current
      if (!dialogoEl?.open) return

      const motorActual = motor.current
      const videoEl = video.current
      if (motorActual && videoEl && stream.current && ahora - ultimaInferencia.current >= INTERVALO_INFERENCIA) {
        ultimaInferencia.current = ahora
        try {
          const resultado = motorActual.detectar(videoEl, ahora)
          if (resultado) {
            pintarCuadro(resultado.entrada)
            const estadoEstable = estabilizador.current.actualizar(resultado.deteccion, ahora)
            if (estadoEstable.cambio) aplicarGesto(estadoEstable.gesto)
            actualizarEstado(resultado.deteccion, ahora, estadoEstable.gesto === 'ninguno' ? 0 : estadoEstable.confianza)
          }
        } catch (error) {
          console.warn('Error al procesar el fotograma:', error)
        }
      }
      animacion.current = requestAnimationFrame(bucle)
    }
    animacion.current = requestAnimationFrame(bucle)
  }, [pintarCuadro, aplicarGesto])

  function actualizarEstado(deteccion: DeteccionGesto, ahora: number, confianzaActual: number) {
    const fps = ultimoFotograma.current ? 1000 / Math.max(1, ahora - ultimoFotograma.current) : 0
    ultimoFotograma.current = ahora
    setConfianza(confianzaActual)
    const partes = [
      deteccion.mano ? 'mano ✓' : 'mano ✕',
      deteccion.rostro ? 'rostro ✓' : 'rostro ✕',
      `motor: ${deteccion.origen}`,
    ]
    if (fps > 0 && fps < 120) partes.push(`${fps.toFixed(0)} fps`)
    setEstado(partes.join(' · '))
  }

  const esperarMetadatos = (videoEl: HTMLVideoElement): Promise<void> => {
    if (videoEl.readyState >= 1 && videoEl.videoWidth > 0) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const temporizador = window.setTimeout(() => {
        limpiar()
        reject(new Error('La cámara no entregó metadatos a tiempo.'))
      }, 5000)
      const alCargar = () => {
        limpiar()
        resolve()
      }
      const limpiar = () => {
        window.clearTimeout(temporizador)
        videoEl.removeEventListener('loadedmetadata', alCargar)
      }
      videoEl.addEventListener('loadedmetadata', alCargar, { once: true })
    })
  }

  const iniciarCamara = useCallback(async () => {
    if (iniciando.current) return
    iniciando.current = true
    if (botonIniciar.current) botonIniciar.current.disabled = true

    try {
      const permiso = await estadoPermiso('camera')
      if (permiso === 'denied') {
        setEstado('Bloqueaste el permiso de cámara. Habilítalo desde el candado de la barra de direcciones y vuelve a intentarlo.')
        return
      }

      const videoEl = video.current
      if (!videoEl) return

      if (!stream.current) {
        if (!navigator.mediaDevices?.getUserMedia) {
          setEstado('La cámara solo funciona en HTTPS o en localhost.')
          return
        }
        setEstado('Pidiendo permiso de cámara…')
        const nuevo = await abrirCamara(facing.current)

        // Si cerraron el diálogo mientras se pedía el permiso, no se deja la
        // cámara encendida sin que nadie la vea.
        if (!dialogo.current?.open || document.hidden) {
          detenerFlujo(nuevo)
          return
        }

        stream.current = nuevo
        videoEl.srcObject = nuevo
        const marcoEl = marco.current
        if (marcoEl) marcoEl.classList.toggle('is-mirror', facing.current === 'user')
        await videoEl.play().catch(() => {})
        await esperarMetadatos(videoEl)

        const lienzoEl = lienzo.current
        if (lienzoEl) {
          lienzoEl.width = videoEl.videoWidth
          lienzoEl.height = videoEl.videoHeight
        }
        ajustarLienzo()
        setCamaraActiva(true)
        setHayVariasCamaras((await contarCamaras()) >= 2)
      }

      if (!motor.current) {
        setEstado('Cargando modelos de visión…')
        if (botonIniciar.current) botonIniciar.current.textContent = 'Cargando…'
        try {
          const nuevoMotor = await MotorGestos.crear()
          motor.current = nuevoMotor
          estabilizador.current = new Estabilizador({ confianzaMinima: Math.min(0.5, nuevoMotor.umbral) })
          setDetalleMotor(`Motor: ${nuevoMotor.detalleModelo}`)
          setEstado(
            nuevoMotor.modo === 'mlp'
              ? 'Modelos entrenados cargados. Haz uno de los gestos.'
              : 'Motor de reglas listo. Cuando entrenes el MLP, se usará automáticamente.',
          )
        } catch (error) {
          console.error('No se pudieron cargar los modelos de MediaPipe:', error)
          detenerCamara()
          setEstado('No se pudieron cargar los modelos. Revisa la conexión o prepara los modelos sin conexión desde la página principal.')
          return
        }
      }

      if (!dialogo.current?.open || document.hidden) {
        detenerCamara()
        return
      }

      if (botonIniciar.current) botonIniciar.current.textContent = 'Cámara activa'
      iniciarBucle()
    } catch (error) {
      setEstado(describirErrorCamara(error))
      detenerCamara()
    } finally {
      iniciando.current = false
      if (botonIniciar.current) botonIniciar.current.disabled = Boolean(stream.current && motor.current)
    }
  }, [ajustarLienzo, detenerCamara, iniciarBucle])

  const cambiarCamara = useCallback(async () => {
    facing.current = facing.current === 'user' ? 'environment' : 'user'
    detenerCamara()
    await iniciarCamara()
  }, [detenerCamara, iniciarCamara])

  const cerrar = useCallback(() => {
    detenerCamara()
    dialogo.current?.close()
    alCerrar()
  }, [detenerCamara, alCerrar])

  // Abrir el diálogo al montar. El modal nativo se encarga del foco y del fondo.
  useEffect(() => {
    const dialogoEl = dialogo.current
    if (!dialogoEl) return
    if (!dialogoEl.open) dialogoEl.showModal()
    // Cerrar con Escape dispara «close»: se limpia igual que con el botón.
    const alCerrarNativo = () => {
      detenerCamara()
      alCerrar()
    }
    dialogoEl.addEventListener('close', alCerrarNativo)
    return () => {
      dialogoEl.removeEventListener('close', alCerrarNativo)
      detenerCamara()
      motor.current?.cerrar()
      motor.current = null
    }
  }, [detenerCamara, alCerrar])

  // Redimensionar la ventana mueve el lienzo de depuración.
  useEffect(() => {
    window.addEventListener('resize', ajustarLienzo)
    return () => window.removeEventListener('resize', ajustarLienzo)
  }, [ajustarLienzo])

  // Al ocultar la pestaña se apaga la cámara: gastaría batería sin que nadie vea.
  useEffect(() => {
    const alCambiarVisibilidad = () => {
      if (!document.hidden || !stream.current) return
      detenerCamara()
      setEstado('La cámara se apagó al salir de la página. Pulsa «Activar cámara» para volver.')
    }
    document.addEventListener('visibilitychange', alCambiarVisibilidad)
    return () => document.removeEventListener('visibilitychange', alCambiarVisibilidad)
  }, [detenerCamara])

  // Al salir de la página: cortar cámara y cerrar MediaPipe (libera GPU/WASM).
  useEffect(() => {
    const alSalir = () => {
      detenerCamara()
      motor.current?.cerrar()
      motor.current = null
    }
    window.addEventListener('pagehide', alSalir)
    return () => window.removeEventListener('pagehide', alSalir)
  }, [detenerCamara])

  const etiqueta = gesto === 'ninguno' ? 'Esperando gesto…' : `${GESTOS[gesto].emoji} ${GESTOS[gesto].etiqueta}`

  return (
    <dialog ref={dialogo} className="dialog dialog-gestures" aria-labelledby="gestos-dialog-titulo">
      <div className="dialog-head">
        <h2 id="gestos-dialog-titulo">Gestos en vivo</h2>
        <button type="button" className="button button-ghost button-small" aria-label="Cerrar gestos" onClick={cerrar}>
          <Icono nombre="close" />
        </button>
      </div>
      <div className="gestures-layout">
        <div className="gestures-video-wrap is-mirror" id="gestos-video-wrap" ref={marco}>
          <video id="video-gestos" ref={video} autoPlay playsInline muted aria-label="Vista de la cámara para reconocer gestos" />
          <canvas id="lienzo-gestos" ref={lienzo} aria-hidden="true" />
          {!camaraActiva && (
            <div id="gestos-placeholder" className="gestures-placeholder">
              <span className="gestures-placeholder-icon"><Icono nombre="camera" /></span>
              <strong>La cámara está apagada</strong>
              <span>Pulsa «Activar cámara» para empezar.</span>
            </div>
          )}
          <span className="gestures-chip" id="gestos-motor">{detalleMotor}</span>
        </div>
        <aside className="gestures-panel">
          <div className="gesture-meme-frame">
            <img id="meme-gestos" src={meme} alt={`Meme del gesto ${GESTOS[gesto].etiqueta}`} />
          </div>
          <p className="gesture-label" id="gesto-etiqueta" data-gesto={gesto}>{etiqueta}</p>
          <div className="confidence" aria-hidden="true"><span id="gesto-confianza" style={{ width: `${Math.round(confianza * 100)}%` }} /></div>
          <p className="status-line" id="gestos-estado" role="status" aria-live="polite">{estado}</p>
          <div className="gesture-actions">
            <button ref={botonIniciar} type="button" className="button button-primary" id="btn-iniciar-gestos" onClick={() => void iniciarCamara()}>
              Activar cámara
            </button>
            {hayVariasCamaras && (
              <button type="button" className="button button-secondary" id="btn-cambiar-gestos" onClick={() => void cambiarCamara()}>
                ⇄ Cambiar cámara
              </button>
            )}
            <button
              type="button"
              className="button button-ghost button-small"
              id="btn-debug-gestos"
              aria-pressed={puntos}
              onClick={() => debug(!puntos)}
            >
              Puntos
            </button>
          </div>
          <p className="gesture-hint">
            El gesto se mantiene unos instantes antes de cambiar el meme. Cierra la vista para apagar la cámara.
          </p>
        </aside>
      </div>
    </dialog>
  )
}
