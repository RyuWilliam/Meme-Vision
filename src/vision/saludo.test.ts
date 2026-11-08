import { describe, expect, it } from 'vitest'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { clasificarReglas } from './reglas.ts'
import { ROSTRO } from './caracteristicas.ts'
import type { EntradaCuadro } from './tipos.ts'

const p = (x: number, y: number, z = 0): NormalizedLandmark => ({ x, y, z, visibility: 1 })

/** Rostro de referencia: sienes en 0.33 y 0.67, ojos en y=0.41. */
function rostro(): NormalizedLandmark[] {
  const r = Array.from({ length: 478 }, () => p(0.5, 0.5))
  r[ROSTRO.frente] = p(0.5, 0.22)
  r[ROSTRO.labioSuperior] = p(0.5, 0.56)
  r[ROSTRO.labioInferior] = p(0.5, 0.58)
  r[ROSTRO.menton] = p(0.5, 0.8)
  r[ROSTRO.mandibulaIzquierda] = p(0.37, 0.6)
  r[ROSTRO.mandibulaDerecha] = p(0.63, 0.6)
  r[ROSTRO.sienDerecha] = p(0.33, 0.36)
  r[ROSTRO.sienIzquierda] = p(0.67, 0.36)
  r[ROSTRO.ojoDerechoArriba] = p(0.41, 0.41)
  r[ROSTRO.ojoIzquierdoArriba] = p(0.59, 0.41)
  return r
}

/**
 * Construye una mano plana con los dedos apuntando hacia arriba (como en una
 * foto de frente), y después la ROTA y la TRASLADA.
 *
 * `rotacion` en radianes gira la mano alrededor de la muñeca. Con -π/2 los
 * dedos apuntan hacia la izquierda de la imagen (lado derecho de la cara).
 */
function manoPlana(
  opciones: {
    rotacion?: number
    muneca?: [number, number]
    /** Grados de la articulación PIP de todos los dedos (180 = rectos). */
    apertura?: number
    pulgar?: boolean
  } = {},
): NormalizedLandmark[] {
  const rot = opciones.rotacion ?? 0
  const [wx, wy] = opciones.muneca ?? [0.5, 0.6]
  const grados = opciones.apertura ?? 175
  const rad = (grados * Math.PI) / 180
  const giro = Math.PI - rad // 0 cuando el dedo está recto

  // Mano en coordenadas locales: muñeca en (0,0), dedos hacia -y.
  const local: Array<[number, number]> = Array.from({ length: 21 }, () => [0, 0])
  local[0] = [0, 0]
  if (opciones.pulgar) {
    local[1] = [-0.04, -0.04]
    local[2] = [-0.08, -0.07]
    local[3] = [-0.12, -0.1]
    local[4] = [-0.16, -0.13]
  } else {
    local[1] = [-0.04, -0.04]
    local[2] = [-0.06, -0.06]
    local[3] = [-0.05, -0.08]
    local[4] = [-0.04, -0.09]
  }

  // Cada dedo: MCP en la base, PIP a 0.06 y TIP según el ángulo.
  const dedos: Array<[number, number, number]> = [
    [5, 6, -0.03],
    [9, 10, 0],
    [13, 14, 0.03],
    [17, 18, 0.06],
  ]
  for (const [mcp, pip, x] of dedos) {
    local[mcp] = [x, -0.15]
    local[pip] = [x, -0.21]
    // Con giro=0 el TIP sigue recto hacia arriba; al doblar se desplaza en x.
    local[mcp + 3] = [x + Math.sin(giro) * 0.06, -0.21 - Math.cos(giro) * 0.06]
  }

  const cos = Math.cos(rot)
  const sin = Math.sin(rot)
  return local.map(([x, y]) => p(wx + x * cos - y * sin, wy + x * sin + y * cos))
}

const entrada = (mano: NormalizedLandmark[]): EntradaCuadro => ({
  mano,
  manoEtiqueta: 'Right',
  rostro: rostro(),
  blendshapes: null,
})

/**
 * El saludo militar REAL: mano plana y horizontal (palma hacia el suelo), la
 * muñeca junto a la oreja y las puntas hacia el centro de la frente. Desde la
 * cámara solo se ve el perfil del meñique.
 *
 * Muñeca derecha (x≈0.66) y dedos apuntando hacia el centro (−x).
 */
const saludoDerecha = (apertura = 175) =>
  entrada(manoPlana({ rotacion: -Math.PI / 2, muneca: [0.66, 0.34], apertura }))

/** Espejo: muñeca izquierda (x≈0.34) y dedos hacia el centro (+x). */
const saludoIzquierda = (apertura = 175) =>
  entrada(manoPlana({ rotacion: Math.PI / 2, muneca: [0.34, 0.34], apertura }))

describe('saludo militar: mano plana y horizontal', () => {
  it('detecta el saludo con la muñeca en la oreja derecha', () => {
    const r = clasificarReglas(saludoDerecha())
    expect(r.gesto).toBe('saludo')
    expect(r.confianza).toBeGreaterThan(0.7)
  })

  it('detecta el saludo con la muñeca en la oreja izquierda', () => {
    const r = clasificarReglas(saludoIzquierda())
    expect(r.gesto).toBe('saludo')
  })

  it('detecta el saludo aunque los dedos no estén perfectamente rectos (145°)', () => {
    // Caso real: con ruido de cámara los dedos rara vez llegan a 180°.
    const r = clasificarReglas(saludoDerecha(145))
    expect(r.gesto).toBe('saludo')
  })

  it('detecta el saludo con la muñeca algo más adentro, cerca de la sien', () => {
    const r = clasificarReglas(
      entrada(manoPlana({ rotacion: -Math.PI / 2, muneca: [0.60, 0.35] })),
    )
    expect(r.gesto).toBe('saludo')
  })

  it('NO acepta la mano vertical delante de la cara (taparse el sol)', () => {
    // Mano plana pero de pie, centrada delante de la frente. Es el gesto que
    // antes se colaba: mano abierta + puntas cerca de la sien.
    const mano = manoPlana({ rotacion: 0, muneca: [0.5, 0.55] })
    const r = clasificarReglas(entrada(mano))
    expect(r.gesto).not.toBe('saludo')
  })

  it('NO acepta una mano horizontal pero centrada, sin ir a la oreja', () => {
    // Horizontal, pero la muñeca está en el centro de la cara.
    const mano = manoPlana({ rotacion: -Math.PI / 2, muneca: [0.5, 0.34] })
    const r = clasificarReglas(entrada(mano))
    expect(r.gesto).not.toBe('saludo')
  })

  it('NO acepta una "V" de dos dedos (eso es peace)', () => {
    // Índice y medio rectos, anillo y meñique doblados.
    const mano = manoPlana({ rotacion: -Math.PI / 2, muneca: [0.66, 0.34] })
    // Doblar anillo y meñique: mover sus TIP hacia la muñeca.
    mano[16] = p(0.60, 0.32)
    mano[20] = p(0.60, 0.36)
    const r = clasificarReglas(entrada(mano))
    expect(r.gesto).not.toBe('saludo')
  })

  it('NO acepta la mano horizontal demasiado abajo (a la altura de la boca)', () => {
    const mano = manoPlana({ rotacion: -Math.PI / 2, muneca: [0.66, 0.62] })
    const r = clasificarReglas(entrada(mano))
    expect(r.gesto).not.toBe('saludo')
  })

  it('NO acepta la mano horizontal por encima de la cabeza', () => {
    const mano = manoPlana({ rotacion: -Math.PI / 2, muneca: [0.66, 0.12] })
    const r = clasificarReglas(entrada(mano))
    expect(r.gesto).not.toBe('saludo')
  })

  it('NO acepta una mano abierta lejos, al lado de la cabeza', () => {
    // Horizontal y a la altura correcta, pero demasiado lejos de la oreja.
    const mano = manoPlana({ rotacion: -Math.PI / 2, muneca: [0.92, 0.34] })
    const r = clasificarReglas(entrada(mano))
    expect(r.gesto).not.toBe('saludo')
  })
})
