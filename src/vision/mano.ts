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
 * Un dedo está extendido si su articulación intermedia queda casi recta y la
 * punta se aleja de la muñeca más que esa articulación. Es independiente de la
 * rotación de la mano.
 */
function dedoExtendido(mano: Punto[], mcp: number, pip: number, tip: number): boolean {
  return angulo(mano[mcp], mano[pip], mano[tip]) > 150
}

export function extensiones(mano: Punto[]): Extensiones {
  const escala = distancia3(mano[0], mano[9]) || 1
  const pulgarRecto = angulo(mano[2], mano[3], mano[4]) > 150
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

/** Distancia de un punto al segmento ab (en 2D). */
export function distanciaASegmento(punto: Punto, a: Punto, b: Punto): number {
  const vx = b.x - a.x
  const vy = b.y - a.y
  const largo2 = vx * vx + vy * vy
  if (largo2 < 1e-12) return distancia2(punto, a)
  const t = Math.min(1, Math.max(0, ((punto.x - a.x) * vx + (punto.y - a.y) * vy) / largo2))
  return Math.hypot(punto.x - (a.x + t * vx), punto.y - (a.y + t * vy))
}
