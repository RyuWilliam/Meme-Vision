import { describe, expect, it } from 'vitest'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import fixture from './__fixtures__/features.json'
import { extraerCaracteristicas } from './caracteristicas.ts'
import type { EntradaCuadro } from './tipos.ts'

const punto = ([x, y, z]: number[]): NormalizedLandmark => ({ x, y, z, visibility: 1 })

/**
 * Paridad Python ↔ TypeScript: el fixture se genera con
 * `nucleo/tests/test_caracteristicas.py` y `extraer_caracteristicas`.
 * Si las dos implementaciones se separan, este test falla.
 */
describe('paridad de características con Python', () => {
  it('produce el mismo vector de 127 valores', () => {
    const muestra = fixture.muestra as {
      landmarks_mano: number[][]
      landmarks_rostro: number[][]
      handedness: string
      blendshapes: Record<string, number>
    }
    const entrada: EntradaCuadro = {
      mano: muestra.landmarks_mano.map(punto),
      manoEtiqueta: muestra.handedness,
      rostro: muestra.landmarks_rostro.map(punto),
      blendshapes: muestra.blendshapes,
    }
    const vector = extraerCaracteristicas(entrada)
    expect(vector).toHaveLength(fixture.esperado.length)
    fixture.esperado.forEach((valor, indice) => {
      expect(vector[indice]).toBeCloseTo(valor, 4)
    })
  })
})
