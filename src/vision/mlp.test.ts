import { describe, expect, it } from 'vitest'
import { predecir, validarModelo } from './mlp.ts'
import type { ModeloMlp } from './tipos.ts'

const modelo: ModeloMlp = {
  version: 'test',
  creado: '2026-01-01T00:00:00Z',
  gestos: ['like', 'silencio'],
  tamano_entrada: 2,
  categorias_rostro: [],
  escalador: { media: [0, 0], desviacion: [1, 1] },
  capas: [
    { pesos: [[1, 0], [0, 1]], sesgos: [0, 0] },
    { pesos: [[2, 0], [0, 2]], sesgos: [0, 0] },
  ],
  umbral: 0.5,
}

describe('MLP', () => {
  it('infiere la clase dominante', () => {
    const a = predecir(modelo, [1, 0])
    const b = predecir(modelo, [0, 1])
    expect(a.gesto).toBe('like')
    expect(b.gesto).toBe('silencio')
    expect(a.confianza).toBeGreaterThan(0.8)
    expect(a.probabilidades).toHaveLength(2)
  })

  it('rechaza un vector del tamaño equivocado', () => {
    expect(() => predecir(modelo, [1])).toThrow(/espera 2 características/)
  })

  it('valida el tamaño de entrada del modelo real', () => {
    expect(validarModelo(modelo)).toBe(false)
  })
})
