import { describe, expect, it } from 'vitest'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { extensiones, extensionesRegla } from './mano.ts'

const p = (x: number, y: number, z = 0): NormalizedLandmark => ({ x, y, z, visibility: 1 })

/**
 * Genera una mano con el índice a un ángulo concreto en la articulación PIP.
 * El resto de dedos se deja recto para no interferir.
 */
function manoConIndice(grados: number): NormalizedLandmark[] {
  const m = Array.from({ length: 21 }, () => p(0.5, 0.5))
  m[0] = p(0.5, 0.6)
  // Pulgar cerrado, sin relevancia aquí.
  for (let i = 1; i <= 4; i++) m[i] = p(0.46, 0.56)
  // Índice: MCP(5) - PIP(6) - TIP(8)
  m[5] = p(0.47, 0.45)
  m[6] = p(0.47, 0.39)
  const rad = (grados * Math.PI) / 180
  const giro = Math.PI - rad
  m[8] = p(0.47 + Math.sin(giro) * 0.06, 0.39 - Math.cos(giro) * 0.06)
  // Medio, anillo y meñique rectos.
  for (const [mcp, pip, x] of [
    [9, 10, 0.5],
    [13, 14, 0.53],
    [17, 18, 0.56],
  ] as const) {
    m[mcp] = p(x, 0.45)
    m[pip] = p(x, 0.39)
    m[mcp + 3] = p(x, 0.33)
  }
  return m
}

/**
 * Estos dos umbrales NO pueden unificarse:
 *
 *   - `extensiones()` (150°) alimenta los flags 64..68 del modelo de mano
 *     exportado, y el entrenamiento en Python usa el mismo 150. Si cambia,
 *     el modelo ve entradas distintas a las del entrenamiento.
 *   - `extensionesRegla()` (140°) es solo para las reglas geométricas, que
 *     necesitan tolerar dedos "casi rectos" porque si no el saludo militar
 *     nunca se detecta.
 *
 * Si alguien los iguala en el futuro, este test lo avisa.
 */
describe('umbrales separados: modelo (150) vs reglas (140)', () => {
  it('a 145° el modelo dice "cerrado" pero la regla dice "extendido"', () => {
    const mano = manoConIndice(145)
    // El modelo usa 150: 145 no llega, así que lo considera cerrado.
    expect(extensiones(mano).indice).toBe(false)
    // La regla usa 140: 145 sí llega, así que lo considera extendido.
    expect(extensionesRegla(mano).indice).toBe(true)
  })

  it('a 160° ambos coinciden en "extendido"', () => {
    const mano = manoConIndice(160)
    expect(extensiones(mano).indice).toBe(true)
    expect(extensionesRegla(mano).indice).toBe(true)
  })

  it('a 120° ambos coinciden en "no extendido"', () => {
    const mano = manoConIndice(120)
    expect(extensiones(mano).indice).toBe(false)
    expect(extensionesRegla(mano).indice).toBe(false)
  })

  it('el umbral del modelo sigue siendo exactamente 150', () => {
    // 151 debe contar como extendido y 149 como cerrado para el modelo.
    expect(extensiones(manoConIndice(151)).indice).toBe(true)
    expect(extensiones(manoConIndice(149)).indice).toBe(false)
  })
})
