import { describe, expect, it } from 'vitest'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { extraerCaracteristicas, ROSTRO } from './caracteristicas.ts'
import { TAMANO_ENTRADA } from './tipos.ts'

const punto = (x: number, y: number, z = 0): NormalizedLandmark => ({
  x,
  y,
  z,
  visibility: 1,
})

function mano(indiceExtendido = true): NormalizedLandmark[] {
  const puntos = Array.from({ length: 21 }, () => punto(0.5, 0.5))
  puntos[0] = punto(0.5, 0.6)
  puntos[9] = punto(0.5, 0.5)
  puntos[1] = punto(0.46, 0.56)
  puntos[2] = punto(0.42, 0.53)
  puntos[3] = punto(0.38, 0.5)
  puntos[4] = punto(0.34, 0.47)
  puntos[5] = punto(0.47, 0.45)
  puntos[6] = punto(0.47, 0.4)
  puntos[7] = punto(0.47, 0.35)
  puntos[8] = indiceExtendido ? punto(0.47, 0.3) : punto(0.47, 0.44)
  for (const [base, x] of [[9, 0.5], [13, 0.53], [17, 0.56]] as const) {
    puntos[base] = punto(x, 0.45)
    puntos[base + 1] = punto(x, 0.4)
    puntos[base + 2] = punto(x, 0.42)
    puntos[base + 3] = punto(x, 0.44)
  }
  return puntos
}

function rostro(): NormalizedLandmark[] {
  const puntos = Array.from({ length: 478 }, () => punto(0.5, 0.5))
  puntos[ROSTRO.frente] = punto(0.5, 0.2)
  puntos[ROSTRO.labioSuperior] = punto(0.5, 0.55)
  puntos[ROSTRO.labioInferior] = punto(0.5, 0.57)
  puntos[ROSTRO.menton] = punto(0.5, 0.8)
  puntos[ROSTRO.mandibulaIzquierda] = punto(0.35, 0.6)
  puntos[ROSTRO.mandibulaDerecha] = punto(0.65, 0.6)
  return puntos
}

describe('características', () => {
  it('produce el vector de 127 y los flags de mano', () => {
    const vector = extraerCaracteristicas({
      mano: mano(),
      manoEtiqueta: 'Right',
      rostro: null,
      blendshapes: null,
    })
    expect(vector).toHaveLength(TAMANO_ENTRADA)
    expect(vector[123]).toBe(1)
    expect(vector[124]).toBe(0)
    expect(vector[125]).toBe(1)
    expect(Number.isFinite(vector.reduce((a, b) => a + b, 0))).toBe(true)
  })

  it('marca rostro y geometría cuando hay cara sin mano', () => {
    const vector = extraerCaracteristicas({
      mano: null,
      manoEtiqueta: null,
      rostro: rostro(),
      blendshapes: { mouthPressLeft: 0.7 },
    })
    expect(vector[124]).toBe(1)
    expect(vector[115]).toBe(-1)
    expect(vector[120]).toBeGreaterThan(0) // boca → mentón
  })

  it('refleja la mano izquierda y conserva los mismos valores', () => {
    const derecha = mano()
    const izquierda = derecha.map(p => ({ ...p, x: 1 - p.x }))
    const a = extraerCaracteristicas({
      mano: derecha,
      manoEtiqueta: 'Right',
      rostro: null,
      blendshapes: null,
    })
    const b = extraerCaracteristicas({
      mano: izquierda,
      manoEtiqueta: 'Left',
      rostro: null,
      blendshapes: null,
    })
    for (let i = 0; i < 63; i++) expect(b[i]).toBeCloseTo(a[i], 5)
  })
})
