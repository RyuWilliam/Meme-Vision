import { GESTOS } from './tipos.ts'
import type { GestoId } from './tipos.ts'

/**
 * Las imágenes viven en `src/assets/memes/<gesto>/`. Vite las procesa, les pone
 * hash y las incluye en el precaché del Service Worker (globPatterns ya cubre
 * `png`), así que funcionan sin conexión sin tocar la configuración de la PWA.
 */
const modulos = import.meta.glob('../assets/memes/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const porCarpeta = new Map<string, string[]>()
for (const [ruta, url] of Object.entries(modulos)) {
  const partes = ruta.split('/')
  const carpeta = partes[partes.length - 2] ?? '_sin_gesto'
  const lista = porCarpeta.get(carpeta) ?? []
  lista.push(url)
  porCarpeta.set(carpeta, lista)
}
for (const lista of porCarpeta.values()) lista.sort()

const rotacion = new Map<string, number>()

/** Devuelve la URL de un meme para el gesto; rota entre variantes si hay varias. */
export function urlMeme(gesto: GestoId): string {
  const carpeta = GESTOS[gesto].carpeta
  const lista = porCarpeta.get(carpeta) ?? porCarpeta.get('_sin_gesto') ?? []
  if (lista.length === 0) return ''
  const indice = (rotacion.get(carpeta) ?? 0) % lista.length
  rotacion.set(carpeta, indice + 1)
  return lista[indice]
}

/** Precarga las imágenes para que el primer cambio de gesto no parpadee. */
export function precargarMemes(): void {
  for (const url of Object.values(modulos)) {
    const imagen = new Image()
    imagen.src = url
  }
}
