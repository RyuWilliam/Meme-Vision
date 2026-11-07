import { GESTOS } from './tipos.ts'
import type { GestoId } from './tipos.ts'

/**
 * Las imágenes viven en `src/assets/memes/<gesto>/`. Vite las procesa, les pone
 * hash y las incluye en el precaché del Service Worker (globPatterns ya cubre
 * `png` y `jpg`), así que funcionan sin conexión sin tocar la configuración.
 *
 * Se aceptan PNG y JPEG porque no todas las fuentes entregan PNG; el formato
 * real del archivo debe coincidir con su extensión para que el navegador lo
 * decodifique.
 */
const modulos = import.meta.glob('../assets/memes/**/*.{png,jpg,jpeg,webp}', {
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

/**
 * Devuelve la URL de un meme para el gesto. Sin `indiceFijo` rota entre
 * variantes; con `indiceFijo` devuelve una variante determinista (para el
 * catálogo de la página, sin alterar la rotación del reconocimiento).
 */
export function urlMeme(gesto: GestoId, indiceFijo?: number): string {
  const carpeta = GESTOS[gesto].carpeta
  const lista = porCarpeta.get(carpeta) ?? porCarpeta.get('_sin_gesto') ?? []
  if (lista.length === 0) return ''
  if (indiceFijo !== undefined) {
    const indice = ((indiceFijo % lista.length) + lista.length) % lista.length
    return lista[indice]
  }
  const indice = (rotacion.get(carpeta) ?? 0) % lista.length
  rotacion.set(carpeta, indice + 1)
  return lista[indice]
}
