import { describe, expect, it } from 'vitest'
import { Estabilizador } from './estabilizador.ts'
import type { DeteccionGesto, GestoId } from './tipos.ts'

function deteccion(gesto: GestoId, confianza = 0.9): DeteccionGesto {
  return {
    gesto,
    confianza,
    origen: 'reglas',
    mano: gesto !== 'ninguno',
    rostro: false,
    integrado: null,
  }
}

describe('Estabilizador', () => {
  it('no cambia hasta alcanzar el mínimo de frames', () => {
    const est = new Estabilizador({ ventana: 5, minimo: 3, cooldownMs: 1000, retencionMs: 500 })
    expect(est.actualizar(deteccion('like'), 0).gesto).toBe('ninguno')
    expect(est.actualizar(deteccion('like'), 10).gesto).toBe('ninguno')
    const estado = est.actualizar(deteccion('like'), 20)
    expect(estado.gesto).toBe('like')
    expect(estado.cambio).toBe(true)
  })

  it('respeta el cooldown entre gestos', () => {
    const est = new Estabilizador({ ventana: 5, minimo: 3, cooldownMs: 1000, retencionMs: 5000 })
    for (let t = 0; t <= 20; t += 10) est.actualizar(deteccion('like'), t)
    for (let t = 30; t <= 50; t += 10) est.actualizar(deteccion('llamada'), t)
    expect(est.gestoActual).toBe('like')
    for (let t = 1100; t <= 1120; t += 10) est.actualizar(deteccion('llamada'), t)
    expect(est.gestoActual).toBe('llamada')
  })

  it('ignora detecciones de baja confianza y limpia por retención', () => {
    const est = new Estabilizador({ ventana: 5, minimo: 3, cooldownMs: 0, retencionMs: 200 })
    for (let t = 0; t <= 20; t += 10) est.actualizar(deteccion('like'), t)
    expect(est.gestoActual).toBe('like')
    for (let t = 600; t <= 620; t += 10) est.actualizar(deteccion('ninguno', 0.1), t)
    // La ventana aún conserva "like"; se necesita un poco más para limpiarla.
    for (let t = 800; t <= 820; t += 10) est.actualizar(deteccion('ninguno', 0.1), t)
    expect(est.gestoActual).toBe('ninguno')
  })
})
