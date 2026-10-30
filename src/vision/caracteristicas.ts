import { CATEGORIAS_ROSTRO, TAMANO_ENTRADA } from './tipos.ts'
import type { EntradaCuadro } from './tipos.ts'
import { distancia2, distanciaASegmento, extensiones, normalizarMano } from './mano.ts'

/** Índices del Face Mesh que usamos para la interacción mano ↔ cara. */
export const ROSTRO = {
  frente: 10,
  labioSuperior: 13,
  labioInferior: 14,
  menton: 152,
  mandibulaIzquierda: 172,
  mandibulaDerecha: 397,
} as const

/**
 * Vector de 127 características, en el mismo orden que `caracteristicas.py`:
 *   0..62   mano normalizada (21 × x,y,z)
 *   63..114 blendshapes faciales (52)
 *   115..122 geometría mano/cara (8)
 *   123..126 flags (mano, rostro, índice extendido, pulgar+meñique)
 */
export function extraerCaracteristicas(
  entrada: EntradaCuadro,
  categoriasRostro: readonly string[] = CATEGORIAS_ROSTRO,
): Float32Array {
  if (categoriasRostro.length !== CATEGORIAS_ROSTRO.length) {
    throw new Error(
      `Se esperaban ${CATEGORIAS_ROSTRO.length} categorías de rostro y llegaron ${categoriasRostro.length}.`,
    )
  }
  const salida = new Float32Array(TAMANO_ENTRADA)
  const mano = entrada.mano && entrada.mano.length >= 21 ? entrada.mano : null
  const rostro = entrada.rostro && entrada.rostro.length > ROSTRO.mandibulaDerecha ? entrada.rostro : null

  if (mano) {
    salida.set(normalizarMano(mano, entrada.manoEtiqueta), 0)
  }

  let offset = 63
  for (const nombre of categoriasRostro) {
    salida[offset++] = entrada.blendshapes?.[nombre] ?? 0
  }

  const puntos = geometria(mano, rostro)
  salida.set(puntos, 115)

  const ext = mano ? extensiones(mano) : null
  salida[123] = mano ? 1 : 0
  salida[124] = rostro ? 1 : 0
  salida[125] = ext?.indice ? 1 : 0
  salida[126] = ext?.pulgar && ext.menique ? 1 : 0

  return salida
}

function geometria(
  mano: EntradaCuadro['mano'] | null,
  rostro: EntradaCuadro['rostro'] | null,
): number[] {
  const salida = new Array<number>(8).fill(-1)
  if (!rostro) return salida

  const frente = rostro[ROSTRO.frente]
  const menton = rostro[ROSTRO.menton]
  const labioSuperior = rostro[ROSTRO.labioSuperior]
  const labioInferior = rostro[ROSTRO.labioInferior]
  const mandibulaIzquierda = rostro[ROSTRO.mandibulaIzquierda]
  const mandibulaDerecha = rostro[ROSTRO.mandibulaDerecha]

  const boca = {
    x: (labioSuperior.x + labioInferior.x) / 2,
    y: (labioSuperior.y + labioInferior.y) / 2,
    z: ((labioSuperior.z ?? 0) + (labioInferior.z ?? 0)) / 2,
  }
  const escalaRostro = distancia2(frente, menton) || 1

  salida[5] = distancia2(boca, menton) / escalaRostro
  if (!mano) return salida

  const indice = mano[8]
  const pulgar = mano[4]
  const muneca = mano[0]

  // Distancia a la línea de la mandíbula: más estable que a un punto suelto.
  const aMandibula = Math.min(
    distanciaASegmento(indice, mandibulaIzquierda, menton),
    distanciaASegmento(indice, mandibulaDerecha, menton),
  )

  salida[0] = distancia2(indice, boca) / escalaRostro
  salida[1] = distancia2(indice, menton) / escalaRostro
  salida[2] = aMandibula / escalaRostro
  salida[3] = distancia2(indice, muneca) / escalaRostro
  salida[4] = distancia2(pulgar, boca) / escalaRostro
  salida[6] = (indice.y - boca.y) / escalaRostro
  salida[7] = (indice.x - boca.x) / escalaRostro

  return salida
}
