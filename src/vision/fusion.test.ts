import { describe, expect, it } from 'vitest'
import { combinarDeteccion } from './fusion.ts'
import type { PrediccionMlp } from './mlp.ts'
import type { ResultadoReglas } from './reglas.ts'

const prediccion = (gesto: PrediccionMlp['gesto'], confianza: number): PrediccionMlp => ({
  gesto,
  confianza,
  probabilidades: [confianza],
})

const reglas = (gesto: ResultadoReglas['gesto'], confianza = 0.8): ResultadoReglas => ({
  gesto,
  confianza,
})

function combinar(parcial: Partial<Parameters<typeof combinarDeteccion>[0]>) {
  return combinarDeteccion({
    reglas: reglas('ninguno', 0),
    mlpMano: null,
    mlpRostro: null,
    umbralMano: 0.6,
    umbralRostro: 0.6,
    mano: true,
    rostro: true,
    integrado: null,
    ...parcial,
  })
}

describe('fusión de reglas y modelos', () => {
  it('NO acepta una predicción por debajo del umbral', () => {
    const resultado = combinar({ mlpMano: prediccion('ok', 0.55) })
    expect(resultado.gesto).toBe('ninguno')
    expect(resultado.confianza).toBe(0)
  })

  it('usa el MLP de mano cuando supera el umbral y las reglas no ven nada', () => {
    const resultado = combinar({ mlpMano: prediccion('ok', 0.9) })
    expect(resultado.gesto).toBe('ok')
    expect(resultado.origen).toBe('mlp-mano')
  })

  it('no inventa un gesto de mano si no hay mano', () => {
    const resultado = combinar({ mano: false, mlpMano: prediccion('ok', 0.99) })
    expect(resultado.gesto).toBe('ninguno')
  })

  it('las reglas de rostro mandan sobre el MLP de mano', () => {
    const resultado = combinar({
      reglas: reglas('silencio', 0.8),
      mlpMano: prediccion('one', 0.95),
    })
    expect(resultado.gesto).toBe('silencio')
    expect(resultado.origen).toBe('reglas')
  })

  it('like y dislike mandan sobre el MLP de mano', () => {
    expect(
      combinar({ reglas: reglas('like', 0.8), mlpMano: prediccion('fist', 0.95) }).gesto,
    ).toBe('like')
    expect(
      combinar({ reglas: reglas('dislike', 0.8), mlpMano: prediccion('fist', 0.95) }).gesto,
    ).toBe('dislike')
  })

  it('cae al MLP de rostro si no hay modelo de mano', () => {
    const resultado = combinar({
      reglas: reglas('ninguno', 0),
      mlpRostro: prediccion('mewing', 0.9),
    })
    expect(resultado.gesto).toBe('mewing')
    expect(resultado.origen).toBe('mlp')
  })

  it('si ambos modelos dudan, devuelve ninguno', () => {
    const resultado = combinar({
      mlpMano: prediccion('peace', 0.2),
      mlpRostro: prediccion('like', 0.3),
    })
    expect(resultado.gesto).toBe('ninguno')
  })
})
