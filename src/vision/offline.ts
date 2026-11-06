// offline.ts — prepara los modelos de visión para usarlos sin conexión.
//
// Los .task de MediaPipe y el WASM no se precachean en la instalación porque
// pesan ~27 MB. La app los descarga explícitamente con progreso y los guarda en
// las mismas cachés que usa Workbox (`modelos-vision` y `wasm-vision`), de modo
// que la ruta CacheFirst del Service Worker los sirva sin red.

const BASE = import.meta.env.BASE_URL

export const CACHE_MODELOS = 'modelos-vision'
export const CACHE_WASM = 'wasm-vision'

const TAREAS = [
  `${BASE}modelos/gesture_recognizer.task`,
  `${BASE}modelos/face_landmarker.task`,
] as const

export interface EstadoOffline {
  listo: boolean
  tareas: number
  wasm: boolean
}

export type ProgresoOffline = (hechos: number, total: number, detalle: string) => void

/**
 * MediaPipe 1.2.2 distribuye una sola variante de WASM (SIMD). Los navegadores
 * sin SIMD no pueden ejecutar el motor actual; no hay un archivo nosimd que
 * descargar.
 */
export function urlWasm(): string {
  return `${BASE}wasm/tasks-vision/vision_wasm_internal.wasm`
}

export async function estadoModelosOffline(): Promise<EstadoOffline> {
  try {
    const [tareas, wasm] = await Promise.all([
      Promise.all(TAREAS.map(async url => Boolean(await caches.match(url)))),
      caches.match(urlWasm()).then(Boolean),
    ])
    const listas = tareas.filter(Boolean).length
    return { listo: listas === TAREAS.length && wasm, tareas: listas, wasm }
  } catch {
    return { listo: false, tareas: 0, wasm: false }
  }
}

async function descargarYGuardar(url: string, cache: Cache): Promise<void> {
  const respuesta = await fetch(url, { cache: 'reload' })
  if (!respuesta.ok) {
    throw new Error(`No se pudo descargar ${url} (HTTP ${respuesta.status}).`)
  }
  await cache.put(url, respuesta)
}

/**
 * Descarga las dos tareas y el WASM que usa MediaPipe.
 * Es idempotente: lo que ya está en caché no se vuelve a pedir.
 */
export async function prepararModelosOffline(onProgress?: ProgresoOffline): Promise<EstadoOffline> {
  const [cacheModelos, cacheWasm] = await Promise.all([
    caches.open(CACHE_MODELOS),
    caches.open(CACHE_WASM),
  ])

  const wasm = urlWasm()
  const total = TAREAS.length + 1
  let hechos = 0

  for (const url of TAREAS) {
    if (!(await cacheModelos.match(url))) {
      await descargarYGuardar(url, cacheModelos)
    }
    hechos++
    onProgress?.(hechos, total, url)
  }

  if (!(await cacheWasm.match(wasm))) {
    await descargarYGuardar(wasm, cacheWasm)
  }
  hechos++
  onProgress?.(hechos, total, wasm)

  // Pedir persistencia es una mejora; el navegador puede ignorarla.
  try {
    await navigator.storage?.persist?.()
  } catch {
    // Sin persistencia la app sigue funcionando; el navegador decide.
  }

  return estadoModelosOffline()
}
