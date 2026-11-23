// DialogoCamara — captura de foto o clip con audio.
//
// Porta el bloque más grande de main.ts (~330 líneas): permisos, stream,
// cambio de cámara, medidor de nivel, MediaRecorder, límite de 30 s y guardado.
// La lógica de dispositivo NO se toca: se usa tal cual desde dispositivo.ts.
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  abrirCamara,
  abrirFlujoConAudio,
  capturarFoto,
  contarCamaras,
  crearGrabadora,
  crearMedidorDeNivel,
  describirErrorCamara,
  describirErrorUbicacion,
  detenerFlujo,
  obtenerUbicacion,
} from '../dispositivo'
import type { Ubicacion } from '../datos/db'
import { Icono } from './Icono'

const MAX_SEGUNDOS_VIDEO = 30

type Modo = 'foto' | 'video'

interface Props {
  alCerrar: () => void
  alGuardar: (datos: {
    nombre: string
    desafio: string
    foto: Blob | null
    video: Blob | null
    ubicacion: Ubicacion | null
  }) => Promise<{ ok: boolean; mensaje: string }>
}

export function DialogoCamara({ alCerrar, alGuardar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const videoEl = useRef<HTMLVideoElement>(null)
  const previewImg = useRef<HTMLImageElement>(null)
  const previewVideo = useRef<HTMLVideoElement>(null)

  const [modo, setModo] = useState<Modo>('foto')
  const [estado, setEstado] = useState('')
  const [hayVariasCamaras, setHayVariasCamaras] = useState(false)
  const [grabando, setGrabando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [nivel, setNivel] = useState(0)
  const [captura, setCaptura] = useState<{ foto: Blob | null; video: Blob | null } | null>(null)
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null)
  const [nombre, setNombre] = useState('')
  const [desafio, setDesafio] = useState('Reto diario')
  const [guardando, setGuardando] = useState(false)
  const [urlPreview, setUrlPreview] = useState<string | null>(null)

  const stream = useRef<MediaStream | null>(null)
  const grabadora = useRef<ReturnType<typeof crearGrabadora> | null>(null)
  const medidor = useRef<{ leer(): number; cerrar(): void } | null>(null)
  const animacionNivel = useRef(0)
  const temporizador = useRef(0)
  const facing = useRef<'user' | 'environment'>('environment')

  const limpiarRecursos = useCallback(() => {
    cancelAnimationFrame(animacionNivel.current)
    window.clearInterval(temporizador.current)
    medidor.current?.cerrar()
    medidor.current = null
    grabadora.current?.destruir()
    grabadora.current = null
    detenerFlujo(stream.current)
    stream.current = null
    if (videoEl.current) videoEl.current.srcObject = null
  }, [])

  const iniciar = useCallback(
    async (modoCaptura: Modo) => {
      limpiarRecursos()
      setEstado('Pidiendo permiso…')
      try {
        // El permiso se pide dentro del clic, nunca al cargar la página.
        const nuevo =
          modoCaptura === 'video'
            ? await abrirFlujoConAudio(facing.current)
            : await abrirCamara(facing.current)
        stream.current = nuevo
        if (videoEl.current) {
          videoEl.current.srcObject = nuevo
          await videoEl.current.play().catch(() => {})
        }
        if (modoCaptura === 'video') {
          medidor.current = crearMedidorDeNivel(nuevo)
          const medir = () => {
            setNivel(medidor.current?.leer() ?? 0)
            animacionNivel.current = requestAnimationFrame(medir)
          }
          animacionNivel.current = requestAnimationFrame(medir)
        }
        setEstado('')
        setHayVariasCamaras((await contarCamaras()) >= 2)
      } catch (error) {
        setEstado(describirErrorCamara(error))
      }
    },
    [limpiarRecursos],
  )

  const capturar = useCallback(async () => {
    const video = videoEl.current
    if (!video) return
    try {
      const foto = await capturarFoto(video)
      setCaptura({ foto, video: null })
      setEstado('Foto capturada. Ponle un nombre y guárdala.')
    } catch (error) {
      setEstado(describirErrorCamara(error))
    }
  }, [])

  const detenerGrabacion = useCallback(async () => {
    window.clearInterval(temporizador.current)
    const actual = grabadora.current
    if (!actual) return
    try {
      const clip = await actual.detener()
      grabadora.current = null
      setGrabando(false)
      setCaptura({ foto: null, video: clip })
      setEstado('Clip grabado. Ponle un nombre y guárdalo.')
    } catch (error) {
      setEstado(`No se pudo detener la grabación: ${error instanceof Error ? error.message : 'error'}.`)
    }
  }, [])

  const empezarGrabacion = useCallback(() => {
    const actual = stream.current
    if (!actual) return
    const nueva = crearGrabadora(actual)
    grabadora.current = nueva
    nueva.iniciar()
    setGrabando(true)
    setSegundos(0)

    temporizador.current = window.setInterval(() => {
      setSegundos((s) => {
        const siguiente = s + 1
        // El límite de 30 s está en la especificación: se corta solo.
        if (siguiente >= MAX_SEGUNDOS_VIDEO) {
          window.clearInterval(temporizador.current)
          void detenerGrabacion()
        }
        return siguiente
      })
    }, 1000)
  }, [detenerGrabacion])

  const pedirUbicacion = useCallback(async () => {
    try {
      setUbicacion(await obtenerUbicacion())
      setEstado('Ubicación adjunta.')
    } catch (error) {
      setEstado(describirErrorUbicacion(error))
    }
  }, [])

  const cambiarCamara = useCallback(async () => {
    facing.current = facing.current === 'user' ? 'environment' : 'user'
    await iniciar(modo)
  }, [iniciar, modo])

  const cambiarModo = useCallback(
    async (nuevo: Modo) => {
      setModo(nuevo)
      setCaptura(null)
      await iniciar(nuevo)
    },
    [iniciar],
  )

  const cerrar = useCallback(() => {
    limpiarRecursos()
    dialogo.current?.close()
    alCerrar()
  }, [limpiarRecursos, alCerrar])

  const guardar = async () => {
    if (!captura) return
    setGuardando(true)
    try {
      const resultado = await alGuardar({
        nombre,
        desafio,
        foto: captura.foto,
        video: captura.video,
        ubicacion,
      })
      setEstado(resultado.mensaje)
      if (resultado.ok) cerrar()
    } finally {
      setGuardando(false)
    }
  }

  // Abrir al montar y arrancar en modo foto.
  useEffect(() => {
    const dialog = dialogo.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    void iniciar('foto')

    const alCerrarNativo = () => {
      limpiarRecursos()
      alCerrar()
    }
    dialog.addEventListener('close', alCerrarNativo)
    return () => {
      dialog.removeEventListener('close', alCerrarNativo)
      limpiarRecursos()
    }
    // Solo al montar: iniciar() y limpiarRecursos() son estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // La previa del clip: se crea la URL y se revoca al cambiar o desmontar.
  useEffect(() => {
    const blob = captura?.foto ?? captura?.video ?? null
    if (!blob) {
      setUrlPreview(null)
      return
    }
    const url = URL.createObjectURL(blob)
    setUrlPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [captura])

  return (
    <dialog ref={dialogo} className="dialog dialog-camera" aria-labelledby="camara-titulo">
      <div className="dialog-head">
        <h2 id="camara-titulo">Cámara en vivo</h2>
        <button type="button" className="button button-ghost button-small" aria-label="Cerrar cámara" onClick={cerrar}>
          <Icono nombre="close" />
        </button>
      </div>

      <div className="mode-tabs" id="modo-tabs" role="tablist" aria-label="Modo de captura">
        <button
          type="button"
          id="tab-foto"
          className={modo === 'foto' ? 'mode-tab is-active' : 'mode-tab'}
          role="tab"
          aria-selected={modo === 'foto'}
          onClick={() => void cambiarModo('foto')}
        >
          <Icono nombre="camera" /> Foto
        </button>
        <button
          type="button"
          id="tab-video"
          className={modo === 'video' ? 'mode-tab is-active' : 'mode-tab'}
          role="tab"
          aria-selected={modo === 'video'}
          onClick={() => void cambiarModo('video')}
        >
          ▶ Vídeo
        </button>
      </div>

      <div className="camera-frame" hidden={captura !== null}>
        <video ref={videoEl} id="video-camara" autoPlay playsInline muted aria-label="Vista de la cámara" />
      </div>

      {captura && (
        <div id="camara-preview" className="camera-preview">
          {captura.foto && urlPreview && <img ref={previewImg} src={urlPreview} alt="Foto capturada" />}
          {captura.video && urlPreview && (
            <video ref={previewVideo} src={urlPreview} controls playsInline aria-label="Vista previa del video grabado" />
          )}
          <div id="camara-preview-datos" className="camera-preview-data">
            <label htmlFor="camara-nombre">Nombre de la creación</label>
            <input
              type="text"
              id="camara-nombre"
              maxLength={80}
              placeholder="Ponle un nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <label htmlFor="camara-desafio">Tipo</label>
            <select id="camara-desafio" value={desafio} onChange={(e) => setDesafio(e.target.value)}>
              <option value="Reto diario">Reto diario</option>
              <option value="Gesto">Gesto</option>
              <option value="Espontáneo">Espontáneo</option>
            </select>
            {ubicacion && (
              <span id="preview-ubicacion" className="chip">
                📍 {ubicacion.lat.toFixed(4)}, {ubicacion.lon.toFixed(4)}
              </span>
            )}
            <button
              type="button"
              id="btn-guardar-creacion"
              className="button button-primary"
              onClick={() => void guardar()}
              disabled={guardando}
            >
              {guardando ? 'Guardando…' : 'Guardar creación'}
            </button>
          </div>
        </div>
      )}

      <p id="camara-estado" className="status-line" role="status" aria-live="polite">{estado}</p>

      {modo === 'video' && !captura && (
        <div id="nivel-audio" className="audio-meter"><span style={{ transform: `scaleX(${Math.min(1, nivel)})` }} /></div>
      )}

      <div className="camera-controls">
        {!captura && modo === 'foto' && (
          <button type="button" id="btn-capturar" className="button button-primary" onClick={() => void capturar()}>
            <Icono nombre="camera" /> Capturar
          </button>
        )}
        {!captura && modo === 'video' && (
          <div id="controles-video" className="video-controls">
            <button
              type="button"
              id="btn-grabar"
              className={grabando ? 'button button-danger' : 'button button-primary'}
              onClick={() => (grabando ? void detenerGrabacion() : empezarGrabacion())}
            >
              {grabando ? '■ Detener' : '● Grabar'}
            </button>
            {grabando && (
              <span id="rec-indicador" className="rec-indicator">
                <i /><span id="rec-tiempo">{String(Math.floor(segundos / 60)).padStart(2, '0')}:{String(segundos % 60).padStart(2, '0')}</span>
              </span>
            )}
          </div>
        )}
        {!captura && (
          <>
            <button type="button" id="btn-ubicacion-camara" className="button button-secondary" onClick={() => void pedirUbicacion()}>
              <Icono nombre="pin" /> Ubicación
            </button>
            {hayVariasCamaras && (
              <button type="button" id="btn-cambiar-camara" className="button button-secondary" onClick={() => void cambiarCamara()}>
                ⇄ Cambiar cámara
              </button>
            )}
          </>
        )}
        {captura && (
          <button type="button" className="button button-ghost" onClick={() => setCaptura(null)}>
            Volver a capturar
          </button>
        )}
      </div>

      <p className="dialog-note">Máximo {MAX_SEGUNDOS_VIDEO} s de video. El clip se guarda en tu dispositivo.</p>
    </dialog>
  )
}
