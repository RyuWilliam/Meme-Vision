import { describe, expect, it } from 'vitest'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { clasificarReglas } from './reglas.ts'
import { ROSTRO } from './caracteristicas.ts'
import type { EntradaCuadro } from './tipos.ts'

const p = (x: number, y: number, z = 0): NormalizedLandmark => ({ x, y, z, visibility: 1 })

/** Rostro de referencia, calibrado con una captura real del gesto. */
function rostro(): NormalizedLandmark[] {
  const r = Array.from({ length: 478 }, () => p(0.5, 0.5))
  r[ROSTRO.frente] = p(0.4, 0.353)
  r[ROSTRO.labioSuperior] = p(0.4, 0.78)
  r[ROSTRO.labioInferior] = p(0.4, 0.82)
  r[ROSTRO.menton] = p(0.4, 0.963)
  r[ROSTRO.mandibulaIzquierda] = p(0.25, 0.78)
  r[ROSTRO.mandibulaDerecha] = p(0.55, 0.78)
  r[ROSTRO.sienDerecha] = p(0.232, 0.6)
  r[ROSTRO.sienIzquierda] = p(0.61, 0.614)
  r[ROSTRO.ojoDerechoArriba] = p(0.316, 0.614)
  r[ROSTRO.ojoIzquierdoArriba] = p(0.505, 0.622)
  return r
}

/**
 * Construye la postura del saludo tal como se ve en la captura real.
 *
 * La clave es que la mano NO es perfectamente horizontal: va en diagonal
 * (unos 32°), desde la muñeca, a un lado de la cabeza, hasta el centro de la
 * frente. Por eso el generador coloca los dedos sobre la recta que une la
 * muñeca con la frente, en lugar de forzar una rotación fija.
 */
function manoSaludo(
  opciones: {
    munecaX?: number
    munecaY?: number
    /** Punto al que deben apuntar las puntas de los dedos. */
    objetivo?: [number, number]
    apertura?: number
  } = {},
): NormalizedLandmark[] {
  const munecaX = opciones.munecaX ?? 0.755
  const munecaY = opciones.munecaY ?? 0.53
  const [objetivoX, objetivoY] = opciones.objetivo ?? [0.4, 0.353]
  const grados = opciones.apertura ?? 175
  const rad = (grados * Math.PI) / 180
  const giro = Math.PI - rad

  // Dirección muñeca → frente, y longitud de la mano (~0.40 del encuadre, que
  // es lo que mide en la captura).
  const dx = objetivoX - munecaX
  const dy = objetivoY - munecaY
  const largo = Math.hypot(dx, dy) || 1
  const ux = dx / largo
  const uy = dy / largo
  // Perpendicular, para separar los dedos entre sí.
  const px = -uy
  const py = ux

  const L = 0.4 // largo muñeca → punta media
  const base = 0.2 // distancia muñeca → nudillos

  const punto = (a: number, b: number): NormalizedLandmark =>
    p(munecaX + ux * a + px * b, munecaY + uy * a + py * b)

  const mano: NormalizedLandmark[] = Array.from({ length: 21 }, () => punto(0, 0))
  // Muñeca
  mano[0] = punto(0, 0)
  // Pulgar: sale hacia un lado, más corto.
  mano[1] = punto(0.05, -0.05)
  mano[2] = punto(0.1, -0.09)
  mano[3] = punto(0.14, -0.12)
  mano[4] = punto(0.18, -0.15)

  const dedos: Array<[number, number, number]> = [
    [5, 6, -0.035],
    [9, 10, 0],
    [13, 14, 0.035],
    [17, 18, 0.07],
  ]
  for (const [mcp, pip, separacion] of dedos) {
    mano[mcp] = punto(base, separacion)
    mano[pip] = punto(base + (L - base) * 0.55, separacion)
    // Con giro=0 el dedo sigue recto; al doblarse se desvía de forma lateral.
    const desvio = Math.sin(giro) * 0.07
    const acorta = (1 - Math.cos(giro)) * 0.07
    mano[mcp + 3] = punto(L - acorta, separacion + desvio)
  }
  return mano
}

const entrada = (mano: NormalizedLandmark[]): EntradaCuadro => ({
  mano,
  manoEtiqueta: 'Right',
  rostro: rostro(),
  blendshapes: null,
})

describe('saludo militar: postura de la captura real', () => {
  it('detecta la postura exacta de la captura (muñeca en 0.755)', () => {
    const r = clasificarReglas(entrada(manoSaludo()))
    expect(r.gesto).toBe('saludo')
    expect(r.confianza).toBeGreaterThan(0.7)
  })

  it('detecta aunque la muñeca quede algo más cerca (0.70)', () => {
    const r = clasificarReglas(entrada(manoSaludo({ munecaX: 0.7 })))
    expect(r.gesto).toBe('saludo')
  })

  it('detecta aunque la muñeca quede algo más lejos (0.80)', () => {
    const r = clasificarReglas(entrada(manoSaludo({ munecaX: 0.8 })))
    expect(r.gesto).toBe('saludo')
  })

  it('detecta con la mano un poco más alta o más baja', () => {
    expect(clasificarReglas(entrada(manoSaludo({ munecaY: 0.5 }))).gesto).toBe('saludo')
    expect(clasificarReglas(entrada(manoSaludo({ munecaY: 0.56 }))).gesto).toBe('saludo')
  })

  it('detecta aunque los dedos no estén perfectamente rectos (145°)', () => {
    // Con ruido de cámara los dedos rara vez llegan a 180°.
    const r = clasificarReglas(entrada(manoSaludo({ apertura: 145 })))
    expect(r.gesto).toBe('saludo')
  })

  it('funciona igual con la mano en el lado izquierdo de la cabeza', () => {
    // Muñeca a la izquierda (0.245) y dedos apuntando al centro de la frente.
    const r = clasificarReglas(entrada(manoSaludo({ munecaX: 0.245, munecaY: 0.53 })))
    expect(r.gesto).toBe('saludo')
  })
})

describe('saludo militar: posturas que NO deben contar', () => {
  it('NO acepta la palma de pie delante de la cara (taparse el sol)', () => {
    // Mano vertical: muñeca abajo y puntas arriba, centrada en la cara.
    const mano = Array.from({ length: 21 }, () => p(0.5, 0.5))
    mano[0] = p(0.4, 0.75)
    mano[1] = p(0.36, 0.71)
    mano[2] = p(0.33, 0.69)
    mano[3] = p(0.3, 0.67)
    mano[4] = p(0.27, 0.65)
    const dedos: Array<[number, number, number]> = [
      [5, 6, 0.36],
      [9, 10, 0.4],
      [13, 14, 0.44],
      [17, 18, 0.48],
    ]
    for (const [mcp, pip, x] of dedos) {
      mano[mcp] = p(x, 0.6)
      mano[pip] = p(x, 0.5)
      mano[mcp + 3] = p(x, 0.4)
    }
    const r = clasificarReglas(entrada(mano))
    expect(r.gesto).not.toBe('saludo')
  })

  it('NO acepta una mano cuya punta cae lejos de la frente', () => {
    // Muñeca a la derecha pero las puntas apuntando hacia arriba y afuera, no
    // al centro de la frente.
    const r = clasificarReglas(
      entrada(manoSaludo({ munecaX: 0.755, objetivo: [0.9, 0.15] })),
    )
    expect(r.gesto).not.toBe('saludo')
  })

  it('NO acepta una mano que cruza toda la cara desde el otro extremo', () => {
    // Muñeca en el borde del encuadre: las puntas caen en la frente, pero la
    // muñeca está demasiado lejos para ser un saludo.
    const r = clasificarReglas(entrada(manoSaludo({ munecaX: 0.98, munecaY: 0.35 })))
    expect(r.gesto).not.toBe('saludo')
  })

  it('NO acepta una "V" de dos dedos (eso es peace)', () => {
    const mano = manoSaludo()
    // Doblar anillo y meñique hacia la palma.
    mano[16] = p(mano[13].x, mano[13].y)
    mano[20] = p(mano[17].x, mano[17].y)
    const r = clasificarReglas(entrada(mano))
    expect(r.gesto).not.toBe('saludo')
  })

  it('NO acepta la mano horizontal a la altura del pecho', () => {
    const r = clasificarReglas(entrada(manoSaludo({ munecaY: 0.85, munecaX: 0.6 })))
    expect(r.gesto).not.toBe('saludo')
  })
})
