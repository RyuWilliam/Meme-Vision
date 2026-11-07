import { describe, expect, it } from 'vitest'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import fixture from './__fixtures__/features-mano.json'
import { extraerCaracteristicasMano } from './caracteristicas-mano.ts'
import { TAMANO_ENTRADA_MANO } from './tipos.ts'
import type { EntradaCuadro } from './tipos.ts'

const punto = ([x, y, z]: number[]): NormalizedLandmark => ({ x, y, z, visibility: 1 })

function entrada(mano: NormalizedLandmark[] | null, etiqueta = 'Right'): EntradaCuadro {
  return { mano, manoEtiqueta: etiqueta, rostro: null, blendshapes: null }
}

describe('características de mano', () => {
  it('produce el mismo vector de 69 que Python', () => {
    const vector = extraerCaracteristicasMano(
      entrada(fixture.muestra.landmarks_mano.map(punto), fixture.muestra.handedness),
    )
    expect(vector).toHaveLength(TAMANO_ENTRADA_MANO)
    expect(vector[63]).toBe(1)
    fixture.esperado.forEach((valor, indice) => {
      expect(vector[indice]).toBeCloseTo(valor, 4)
    })
  })

  it('devuelve ceros cuando no hay mano', () => {
    const vector = extraerCaracteristicasMano(entrada(null))
    expect(vector).toHaveLength(TAMANO_ENTRADA_MANO)
    expect(vector.every(valor => valor === 0)).toBe(true)
  })

  it('no cambia al rotar la mano en el plano', () => {
    const original = fixture.muestra.landmarks_mano.map(punto)
    const angulo = Math.PI / 5
    const coseno = Math.cos(angulo)
    const seno = Math.sin(angulo)
    const muneca = original[0]
    const rotada = original.map(p => ({
      ...p,
      x: muneca.x + (p.x - muneca.x) * coseno - (p.y - muneca.y) * seno,
      y: muneca.y + (p.x - muneca.x) * seno + (p.y - muneca.y) * coseno,
    }))

    const a = extraerCaracteristicasMano(entrada(original))
    const b = extraerCaracteristicasMano(entrada(rotada))
    for (let i = 0; i < TAMANO_ENTRADA_MANO; i++) {
      expect(b[i]).toBeCloseTo(a[i], 4)
    }
  })
})
