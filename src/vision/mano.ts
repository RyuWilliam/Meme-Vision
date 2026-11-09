export interface Punto {
  x: number
  y: number
  z?: number
}

export interface Extensiones {
  pulgar: boolean
  indice: boolean
  medio: boolean
  anillo: boolean
  menique: boolean
}

const grados = (radianes: number) => (radianes * 180) / Math.PI

export function distancia3(a: Punto, b: Punto): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0))
}

export function distancia2(a: Punto, b: Punto): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Ángulo en grados en el vértice `b`, entre los segmentos b→a y b→c. */
export function angulo(a: Punto, b: Punto, c: Punto): number {
  const ux = a.x - b.x
  const uy = a.y - b.y
  const uz = (a.z ?? 0) - (b.z ?? 0)
  const vx = c.x - b.x
  const vy = c.y - b.y
  const vz = (c.z ?? 0) - (b.z ?? 0)
  const nu = Math.hypot(ux, uy, uz)
  const nv = Math.hypot(vx, vy, vz)
  if (nu < 1e-9 || nv < 1e-9) return 0
  const cos = Math.min(1, Math.max(-1, (ux * vx + uy * vy + uz * vz) / (nu * nv)))
  return grados(Math.acos(cos))
}

/**
 * Umbral de la articulación intermedia (PIP) para `extensiones()`.
 *
 * OJO: este valor NO es arbitrario. `extensiones()` alimenta los 5 flags
 * (64..68) del modelo de mano exportado, y el entrenamiento en Python usa
 * exactamente `> 150` (`nucleo/src/meme_vision/geometria.py`). Cambiarlo aquí
 * rompería la paridad entre entrenamiento e inferencia, y el test
 * `paridad.test.ts` lo detectaría. Para las reglas geométricas hay umbrales
 * aparte, ver `anguloDedo`.
 */
const PIP_EXTENDIDO_MLP = 150

/** Ángulo de la articulación intermedia de un dedo, en grados. */
export function anguloDedo(mano: Punto[], mcp: number, pip: number, tip: number): number {
  return angulo(mano[mcp], mano[pip], mano[tip])
}

/** El dedo está claramente extendido (articulación casi recta). */
function dedoExtendido(mano: Punto[], mcp: number, pip: number, tip: number): boolean {
  return anguloDedo(mano, mcp, pip, tip) > PIP_EXTENDIDO_MLP
}

export function extensiones(mano: Punto[]): Extensiones {
  const escala = distancia3(mano[0], mano[9]) || 1
  const pulgarRecto = angulo(mano[2], mano[3], mano[4]) > PIP_EXTENDIDO_MLP
  const pulgarLejos = distancia3(mano[4], mano[0]) > distancia3(mano[2], mano[0]) * 1.15
  const pulgarSeparado = distancia3(mano[4], mano[5]) > 0.8 * escala

  return {
    pulgar: pulgarRecto && pulgarLejos && pulgarSeparado,
    indice: dedoExtendido(mano, 5, 6, 8),
    medio: dedoExtendido(mano, 9, 10, 12),
    anillo: dedoExtendido(mano, 13, 14, 16),
    menique: dedoExtendido(mano, 17, 18, 20),
  }
}

/**
 * Umbrales de las REGLAS geométricas (no del modelo), en grados.
 *
 * Con un único umbral en 150 había dos problemas opuestos, medidos sobre
 * 11.500 muestras reales de HaGRID:
 *
 *   - Un dedo casi recto pero no perfecto (~140°) contaba como CERRADO. En una
 *     mano plana eso pasaba a menudo, así que la mano plana no se reconocía y
 *     el saludo militar no entraba (solo 60% estable con ruido normal).
 *   - A la vez, en el gesto de llamada bastaba con que índice, medio y anillo
 *     quedaran por debajo de 150 para darla por buena. En una palma real
 *     cualquiera de los tres baja de 150 por ruido, y con eso ya salía una
 *     "llamada" falsa al intentar el saludo.
 *
 * La solución es una zona muerta: por encima de `EXTENDIDO` el dedo está
 * claramente extendido; por debajo de `CERRADO` está claramente cerrado; en
 * medio no se afirma nada. Con 140/110 el saludo sube al 88% de estabilidad y
 * los falsos positivos de llamada bajan a 0%.
 */
const PIP_EXTENDIDO_REGLA = 140
const PIP_CERRADO_REGLA = 110

/** Para las reglas: el dedo está claramente extendido. */
export function dedoExtendidoRegla(mano: Punto[], mcp: number, pip: number, tip: number): boolean {
  return anguloDedo(mano, mcp, pip, tip) > PIP_EXTENDIDO_REGLA
}

/** Para las reglas: el dedo está claramente cerrado. */
export function dedoCerradoRegla(mano: Punto[], mcp: number, pip: number, tip: number): boolean {
  return anguloDedo(mano, mcp, pip, tip) < PIP_CERRADO_REGLA
}

/**
 * Extensiones con los umbrales de las reglas (no los del modelo).
 * `extensiones()` sigue usando 150 para no romper la paridad con Python.
 */
export function extensionesRegla(mano: Punto[]): Extensiones {
  const escala = distancia3(mano[0], mano[9]) || 1
  const pulgarRecto = angulo(mano[2], mano[3], mano[4]) > PIP_EXTENDIDO_REGLA
  const pulgarLejos = distancia3(mano[4], mano[0]) > distancia3(mano[2], mano[0]) * 1.15
  const pulgarSeparado = distancia3(mano[4], mano[5]) > 0.8 * escala

  return {
    pulgar: pulgarRecto && pulgarLejos && pulgarSeparado,
    indice: dedoExtendidoRegla(mano, 5, 6, 8),
    medio: dedoExtendidoRegla(mano, 9, 10, 12),
    anillo: dedoExtendidoRegla(mano, 13, 14, 16),
    menique: dedoExtendidoRegla(mano, 17, 18, 20),
  }
}

/**
 * Dedos CLARAMENTE cerrados, para reglas que se disparan al verlos doblados
 * (`llamada`, `fist`). Con la zona muerta, un dedo a 130° no cuenta ni como
 * extendido ni como cerrado, así que el ruido ya no inventa gestos.
 */
export function dedosCerrados(mano: Punto[]): { indice: boolean; medio: boolean; anillo: boolean; menique: boolean } {
  return {
    indice: dedoCerradoRegla(mano, 5, 6, 8),
    medio: dedoCerradoRegla(mano, 9, 10, 12),
    anillo: dedoCerradoRegla(mano, 13, 14, 16),
    menique: dedoCerradoRegla(mano, 17, 18, 20),
  }
}

/**
 * Convierte los 21 landmarks de MediaPipe en 63 valores invariantes a traslación
 * y escala: se centra en la muñeca (0) y se divide por la distancia muñeca →
 * nudillo del dedo medio (9). La mano izquierda se refleja en X para que el
 * modelo no dependa de la lateralidad.
 */
export function normalizarMano(mano: Punto[], etiqueta: string | null): number[] {
  const muneca = mano[0]
  const escala = distancia3(muneca, mano[9]) || 1
  const esIzquierda = etiqueta === 'Left'
  const salida: number[] = []

  for (let i = 0; i < 21; i++) {
    const punto = mano[i]
    const x = (punto.x - muneca.x) / escala
    const y = (punto.y - muneca.y) / escala
    const z = ((punto.z ?? 0) - (muneca.z ?? 0)) / escala
    salida.push(esIzquierda ? -x : x, y, z)
  }
  return salida
}

/**
 * Igual que `normalizarMano`, pero además gira la mano para que el nudillo del
 * índice (5) quede vertical. Es la canonicalización que usa el CSV de HaGRID,
 * así el modelo de mano ve lo mismo entrenando que en vivo.
 */
export function normalizarManoCanonica(
  mano: Punto[],
  etiqueta: string | null,
): number[] {
  const muneca = mano[0]
  const dx = mano[5].x - muneca.x
  const dy = mano[5].y - muneca.y
  const angulo = Math.atan2(dy, dx) + Math.PI / 2
  const coseno = Math.cos(angulo)
  const seno = Math.sin(angulo)
  const esIzquierda = etiqueta === 'Left'

  const relativos = Array.from({ length: 21 }, (_, i) => {
    const x = mano[i].x - muneca.x
    const y = mano[i].y - muneca.y
    return {
      x: x * coseno + y * seno,
      y: -x * seno + y * coseno,
      z: (mano[i].z ?? 0) - (muneca.z ?? 0),
    }
  })
  const escala = Math.hypot(relativos[9].x, relativos[9].y, relativos[9].z) || 1

  const salida: number[] = []
  for (const punto of relativos) {
    const x = punto.x / escala
    salida.push(esIzquierda ? -x : x, punto.y / escala, punto.z / escala)
  }
  return salida
}

/** Distancia de un punto al segmento ab (en 2D). */
export function distanciaASegmento(punto: Punto, a: Punto, b: Punto): number {
  const vx = b.x - a.x
  const vy = b.y - a.y
  const largo2 = vx * vx + vy * vy
  if (largo2 < 1e-12) return distancia2(punto, a)
  const t = Math.min(1, Math.max(0, ((punto.x - a.x) * vx + (punto.y - a.y) * vy) / largo2))
  return Math.hypot(punto.x - (a.x + t * vx), punto.y - (a.y + t * vy))
}
