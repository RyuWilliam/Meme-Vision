// dispositivo.ts — APIs de dispositivo de MemeVision (Sesión 24):
// cámara, micrófono y ubicación con el modelo de permisos, los errores y el
// ciclo de vida que exige la guía. Solo funciona en HTTPS o localhost.

import type { Ubicacion } from './datos/db.ts'

export type EstadoPermiso = 'granted' | 'denied' | 'prompt' | 'desconocido'

/** Consulta el estado de un permiso SIN mostrar ningún aviso (Permissions API). */
export async function estadoPermiso(nombre: string): Promise<EstadoPermiso> {
  try {
    const r = await navigator.permissions.query({ name: nombre as PermissionName })
    return r.state
  } catch {
    return 'desconocido' // el navegador no soporta ese nombre
  }
}

/** ¿Existe navigator.mediaDevices? (contexto seguro). En HTTP vale undefined. */
export function mediaDisponible(): boolean {
  return !!navigator.mediaDevices?.getUserMedia
}

const pistaVideo = (facingMode: 'user' | 'environment') => ({
  facingMode: { ideal: facingMode }, // "ideal": se adapta si no existe la cámara pedida
  width: { ideal: 1280 },
  height: { ideal: 720 },
})

/** Abre la cámara para capturar una foto (sin audio). */
export function abrirCamara(facingMode: 'user' | 'environment' = 'environment'): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ video: pistaVideo(facingMode), audio: false })
}

/** Abre cámara + micrófono para la vista en vivo con audio. */
export function abrirFlujoConAudio(facingMode: 'user' | 'environment' = 'environment'): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: pistaVideo(facingMode),
    audio: { echoCancellation: true, noiseSuppression: true },
  })
}

/** Dibuja el fotograma actual en un <canvas> y lo exporta a Blob JPEG (máx. 640 px). */
export function capturarFoto(video: HTMLVideoElement, anchoMax = 640): Promise<Blob> {
  const escala = Math.min(1, anchoMax / video.videoWidth)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(video.videoWidth * escala)
  canvas.height = Math.round(video.videoHeight * escala)
  canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.8))
}

/** Detiene CADA pista: sin esto el LED queda encendido y nadie más usa el hardware. */
export function detenerFlujo(stream: MediaStream | null): void {
  stream?.getTracks().forEach(pista => pista.stop())
}

/** Mide el nivel del micrófono (0 = silencio, 1 = máximo) con un AnalyserNode. */
export function crearMedidorDeNivel(stream: MediaStream): { leer(): number; cerrar(): void } {
  const ctx = new AudioContext()
  void ctx.resume() // dentro de un clic: política de autoplay
  const analizador = ctx.createAnalyser()
  analizador.fftSize = 512
  ctx.createMediaStreamSource(stream).connect(analizador)
  const datos = new Uint8Array(analizador.fftSize)
  return {
    leer() {
      analizador.getByteTimeDomainData(datos)
      let pico = 0
      for (const v of datos) pico = Math.max(pico, Math.abs(v - 128))
      return pico / 128
    },
    cerrar() {
      stream.getTracks().forEach(p => p.stop())
      void ctx.close()
    },
  }
}

/** Pide la posición una vez (getCurrentPosition) con timeout y máxima antigüedad. */
export function obtenerUbicacion({ altaPrecision = false, timeoutMs = 10000 } = {}): Promise<Ubicacion> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject({ code: 0, message: 'Geolocation no disponible' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos =>
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          precision: Math.round(pos.coords.accuracy),
          momento: new Date(pos.timestamp).toISOString(),
        }),
      reject,
      { enableHighAccuracy: altaPrecision, timeout: timeoutMs, maximumAge: 60000 }
    )
  })
}

/** Traduce los errores de getUserMedia a un mensaje para el usuario. */
export function describirErrorCamara(err: unknown): string {
  switch ((err as { name?: string })?.name) {
    case 'NotAllowedError':
      return 'Bloqueaste el permiso de cámara. Habilítalo desde el candado de la barra de direcciones.'
    case 'NotFoundError':
      return 'Este dispositivo no tiene cámara disponible.'
    case 'NotReadableError':
      return 'La cámara está siendo usada por otra aplicación.'
    case 'OverconstrainedError':
      return 'La cámara no soporta la configuración pedida.'
    case 'TypeError':
      return 'La cámara solo funciona en HTTPS o en localhost.'
    default:
      return `No se pudo abrir la cámara (${(err as { name?: string })?.name ?? 'error desconocido'}).`
  }
}

/** Traduce los códigos de Geolocation (no usa nombres, usa números) a un mensaje. */
export function describirErrorUbicacion(err: unknown): string {
  switch ((err as { code?: number })?.code) {
    case 1:
      return 'Denegaste el permiso de ubicación. La creación sigue funcionando sin ella.'
    case 2:
      return 'No se pudo determinar la posición (sin señal GPS o de red).'
    case 3:
      return 'La ubicación tardó demasiado en responder. Intenta de nuevo.'
    default:
      return 'La ubicación no está disponible en este navegador.'
  }
}
