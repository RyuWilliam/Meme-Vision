import { describe, expect, it } from 'vitest'
import modeloJson from '../../public/modelos/gestos_mano_mlp.json'
import { validarModelo } from './mlp.ts'
import { TAMANO_ENTRADA_MANO } from './tipos.ts'
import type { ModeloMlp } from './tipos.ts'

const modelo = modeloJson as unknown as ModeloMlp

describe('modelo de mano exportado', () => {
  it('valida el JSON que consume la PWA', () => {
    expect(modelo.tamano_entrada).toBe(TAMANO_ENTRADA_MANO)
    expect(validarModelo(modelo, TAMANO_ENTRADA_MANO)).toBe(true)
    expect(modelo.gestos).toContain('ok')
    expect(modelo.gestos).toContain('ninguno')
    expect(modelo.categorias_rostro).toEqual([])
  })
})
