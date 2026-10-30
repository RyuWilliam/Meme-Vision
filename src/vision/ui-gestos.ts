import { abrirCamara, contarCamaras, describirErrorCamara, detenerFlujo } from '../dispositivo.ts'
import { Estabilizador } from './estabilizador.ts'
import { precargarMemes, urlMeme } from './memes.ts'
import { MotorGestos } from './motor.ts'
import { GESTOS } from './tipos.ts'
import type { DeteccionGesto, EntradaCuadro, GestoId } from './tipos.ts'

const CONEXIONES_MANO: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
]

const PUNTOS_ROSTRO_DEBUG = [10, 13, 14, 152, 172, 397]

export interface ControlGestos {
  abrir(): Promise<void>
}

export function montarGestos(): ControlGestos {
  const dlg = document.querySelector<HTMLDialogElement>('#dlg-gestos')!
  const video = document.querySelector<HTMLVideoElement>('#video-gestos')!
  const lienzo = document.querySelector<HTMLCanvasElement>('#lienzo-gestos')!
  const marco = document.querySelector<HTMLDivElement>('#gestos-video-wrap')!
  const meme = document.querySelector<HTMLImageElement>('#meme-gestos')!
  const etiquetaEl = document.querySelector<HTMLParagraphElement>('#gesto-etiqueta')!
  const confianzaEl = document.querySelector<HTMLSpanElement>('#gesto-confianza')!
  const estadoEl = document.querySelector<HTMLParagraphElement>('#gestos-estado')!
  const motorEl = document.querySelector<HTMLSpanElement>('#gestos-motor')!
  const btnCerrar = document.querySelector<HTMLButtonElement>('#btn-cerrar-gestos')!
  const btnIniciar = document.querySelector<HTMLButtonElement>('#btn-iniciar-gestos')!
  const btnCambiar = document.querySelector<HTMLButtonElement>('#btn-cambiar-gestos')!
  const btnDebug = document.querySelector<HTMLButtonElement>('#btn-debug-gestos')!
  const ctx = lienzo.getContext('2d')!

  let stream: MediaStream | null = null
  let motor: MotorGestos | null = null
  let animacion = 0
  let ultimaInferencia = 0
  let ultimoFotograma = 0
  let facing: 'user' | 'environment' = 'user'
  let debug = false
  let iniciando = false
  let estabilizador = new Estabilizador()

  precargarMemes()
  meme.src = urlMeme('ninguno')
  etiquetaEl.dataset.gesto = 'ninguno'
  btnDebug.setAttribute('aria-pressed', 'false')

  async function abrir(): Promise<void> {
    if (dlg.open) return
    dlg.showModal()
    if (!stream || !motor) await iniciarCamara()
    else iniciarBucle()
  }

  async function iniciarCamara(): Promise<void> {
    if (iniciando) return
    iniciando = true
    btnIniciar.disabled = true
    try {
      if (!stream) {
        if (!navigator.mediaDevices?.getUserMedia) {
          estadoEl.textContent = 'La cámara solo funciona en HTTPS o en localhost.'
          return
        }
        estadoEl.textContent = 'Pidiendo permiso de cámara…'
        stream = await abrirCamara(facing)
        video.srcObject = stream
        marco.classList.toggle('espejo', facing === 'user')
        await video.play().catch(() => {})
        await esperarMetadatos()
        lienzo.width = video.videoWidth
        lienzo.height = video.videoHeight
        ajustarLienzo()
        btnCambiar.classList.toggle('oculta', (await contarCamaras()) < 2)
      }

      if (!motor) {
        estadoEl.textContent = 'Cargando modelos de visión…'
        try {
          motor = await MotorGestos.crear()
          estabilizador = new Estabilizador({
            confianzaMinima: Math.min(0.6, motor.umbral),
          })
          motorEl.textContent = `Motor: ${motor.detalleModelo}`
          estadoEl.textContent =
            motor.modo === 'mlp'
              ? 'Modelo entrenado cargado. Haz uno de los 4 gestos.'
              : 'Motor de reglas listo. Cuando entrenes el MLP, se usará automáticamente.'
        } catch (error) {
          console.error('No se pudieron cargar los modelos de MediaPipe:', error)
          estadoEl.textContent =
            'No se pudieron cargar los modelos. Revisa la conexión y vuelve a intentar.'
          return
        }
      }

      iniciarBucle()
    } catch (error) {
      estadoEl.textContent = describirErrorCamara(error)
      detenerCamara()
    } finally {
      iniciando = false
      btnIniciar.disabled = false
    }
  }

  /**
   * Ajusta el lienzo al rectángulo real que ocupa el video con `object-fit:
   * contain`. Así los puntos de depuración quedan alineados aunque la cámara
   * sea vertical u horizontal.
   */
  function ajustarLienzo(): void {
    if (!video.videoWidth || !video.videoHeight) return
    const anchoMarco = marco.clientWidth
    const altoMarco = marco.clientHeight
    const escala = Math.min(anchoMarco / video.videoWidth, altoMarco / video.videoHeight)
    const ancho = video.videoWidth * escala
    const alto = video.videoHeight * escala
    lienzo.style.width = `${ancho}px`
    lienzo.style.height = `${alto}px`
    lienzo.style.left = `${(anchoMarco - ancho) / 2}px`
    lienzo.style.top = `${(altoMarco - alto) / 2}px`
    lienzo.style.right = 'auto'
    lienzo.style.bottom = 'auto'
  }

  function esperarMetadatos(): Promise<void> {
    if (video.readyState >= 1 && video.videoWidth > 0) return Promise.resolve()
    return new Promise(resolve => {
      video.addEventListener('loadedmetadata', () => resolve(), { once: true })
    })
  }

  function iniciarBucle(): void {
    cancelAnimationFrame(animacion)
    ultimaInferencia = 0
    const bucle = (ahora: number) => {
      if (!dlg.open) return
      if (motor && stream && ahora - ultimaInferencia >= 65) {
        ultimaInferencia = ahora
        try {
          const resultado = motor.detectar(video, ahora)
          if (resultado) {
            pintarCuadro(resultado.entrada)
            const estado = estabilizador.actualizar(resultado.deteccion, ahora)
            if (estado.cambio) aplicarGesto(estado.gesto)
            actualizarEstado(
              resultado.deteccion,
              ahora,
              estado.gesto === 'ninguno' ? 0 : estado.confianza,
            )
          }
        } catch (error) {
          console.warn('Error al procesar el fotograma:', error)
        }
      }
      animacion = requestAnimationFrame(bucle)
    }
    animacion = requestAnimationFrame(bucle)
  }

  function aplicarGesto(gesto: GestoId): void {
    const config = GESTOS[gesto]
    const url = urlMeme(gesto)
    if (url && meme.src !== url) {
      meme.src = url
      meme.classList.remove('entra')
      void meme.offsetWidth
      meme.classList.add('entra')
    }
    etiquetaEl.textContent =
      gesto === 'ninguno' ? 'Esperando gesto…' : `${config.emoji} ${config.etiqueta}`
    etiquetaEl.dataset.gesto = gesto
  }

  function actualizarEstado(
    deteccion: DeteccionGesto,
    ahora: number,
    confianza: number,
  ): void {
    const fps = ultimoFotograma ? 1000 / Math.max(1, ahora - ultimoFotograma) : 0
    ultimoFotograma = ahora
    confianzaEl.style.width = `${Math.round(confianza * 100)}%`
    const partes = [
      deteccion.mano ? 'mano ✓' : 'mano ✕',
      deteccion.rostro ? 'rostro ✓' : 'rostro ✕',
      `motor: ${deteccion.origen}`,
    ]
    if (fps > 0 && fps < 120) partes.push(`${fps.toFixed(0)} fps`)
    estadoEl.textContent = partes.join(' · ')
  }

  function pintarCuadro(entrada: EntradaCuadro): void {
    ctx.clearRect(0, 0, lienzo.width, lienzo.height)
    if (!debug) return

    const ancho = lienzo.width
    const alto = lienzo.height
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
  }

  function detenerCamara(): void {
    cancelAnimationFrame(animacion)
    animacion = 0
    detenerFlujo(stream)
    stream = null
    video.srcObject = null
    ctx.clearRect(0, 0, lienzo.width, lienzo.height)
    estabilizador.reiniciar()
    meme.src = urlMeme('ninguno')
    etiquetaEl.textContent = 'Esperando gesto…'
    etiquetaEl.dataset.gesto = 'ninguno'
    confianzaEl.style.width = '0%'
    motorEl.textContent = 'Motor: —'
  }

  btnCerrar.addEventListener('click', () => dlg.close())
  btnIniciar.addEventListener('click', () => void iniciarCamara())
  btnCambiar.addEventListener('click', async () => {
    facing = facing === 'user' ? 'environment' : 'user'
    detenerCamara()
    await iniciarCamara()
  })
  btnDebug.addEventListener('click', () => {
    debug = !debug
    btnDebug.setAttribute('aria-pressed', String(debug))
    if (!debug) ctx.clearRect(0, 0, lienzo.width, lienzo.height)
  })

  dlg.addEventListener('close', detenerCamara)
  window.addEventListener('resize', ajustarLienzo)
  window.addEventListener('pagehide', () => {
    detenerCamara()
    if (dlg.open) dlg.close()
    motor?.cerrar()
    motor = null
  })

  return { abrir }
}
