import { describe, expect, it } from 'vitest'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { clasificarReglas } from './reglas.ts'
import { dedosCerrados, extensionesRegla } from './mano.ts'
import { ROSTRO } from './caracteristicas.ts'
import type { EntradaCuadro } from './tipos.ts'

const p = (x: number, y: number, z = 0): NormalizedLandmark => ({ x, y, z, visibility: 1 })

/**
 * Construye 21 landmarks con una apertura controlada de cada dedo.
 *
 * `apertura` son los grados de la articulación intermedia (PIP) de cada dedo:
 * 180 = completamente recto, 90 = doblado en ángulo recto, 0 = doblado del todo.
 * Así se pueden simular dedos "casi rectos" (el caso que rompía el saludo) y
 * dedos "casi cerrados" (el caso que inventaba llamadas).
 */
function manoCon(aperturas: { indice?: number; medio?: number; anillo?: number; menique?: number; pulgar?: boolean }): NormalizedLandmark[] {
  const m = Array.from({ length: 21 }, () => p(0.5, 0.5))
  m[0] = p(0.5, 0.6)

  if (aperturas.pulgar) {
    m[1] = p(0.46, 0.56)
    m[2] = p(0.42, 0.53)
    m[3] = p(0.38, 0.5)
    m[4] = p(0.34, 0.47)
  } else {
    m[1] = p(0.46, 0.56)
    m[2] = p(0.44, 0.54)
    m[3] = p(0.45, 0.52)
    m[4] = p(0.46, 0.51)
  }

  // Cada dedo se dibuja como una cadena de tres puntos (MCP, PIP, TIP) sobre
  // una vertical, con el ángulo pedido en la PIP.
  const dedos: Array<[number, number, number | undefined, number]> = [
    [5, 6, aperturas.indice, 0.47],
    [9, 10, aperturas.medio, 0.5],
    [13, 14, aperturas.anillo, 0.53],
    [17, 18, aperturas.menique, 0.56],
  ]
  for (const [mcp, pip, aperturaGrados, x] of dedos) {
    const grados = aperturaGrados ?? 0 // 0 = cerrado del todo
    const rad = (grados * Math.PI) / 180
    // MCP en la base, PIP a 0.06 arriba; el TIP se abre según el ángulo.
    m[mcp] = p(x, 0.45)
    m[pip] = p(x, 0.39)
    const largo = 0.06
    // El ángulo se mide en la PIP entre (MCP→PIP) y (PIP→TIP).
    // Con 180° el TIP sigue recto hacia arriba; con menos, se dobla.
    const giro = Math.PI - rad
    m[mcp + 3] = p(x + Math.sin(giro) * largo, 0.39 - Math.cos(giro) * largo)
  }
  return m
}

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

const entrada = (mano: NormalizedLandmark[]): EntradaCuadro => ({
  mano,
  manoEtiqueta: 'Right',
  rostro: rostro(),
  blendshapes: null,
})

describe('zona muerta de los dedos (EXTENDIDO 140 / CERRADO 110)', () => {
  it('un dedo a 145° cuenta como extendido, no como cerrado', () => {
    // Este era el bug: 145° queda por debajo del umbral viejo de 150, así que
    // se trataba como cerrado y rompía la detección de la mano plana.
    const e = extensionesRegla(manoCon({ indice: 145, medio: 145, anillo: 145, menique: 145 }))
    expect(e.indice).toBe(true)
    expect(e.medio).toBe(true)
    expect(e.anillo).toBe(true)
    const c = dedosCerrados(manoCon({ indice: 145, medio: 145, anillo: 145 }))
    expect(c.indice).toBe(false)
    expect(c.medio).toBe(false)
    expect(c.anillo).toBe(false)
  })

  it('un dedo a 130° está en zona muerta: ni extendido ni cerrado', () => {
    const e = extensionesRegla(manoCon({ indice: 130 }))
    const c = dedosCerrados(manoCon({ indice: 130 }))
    expect(e.indice).toBe(false)
    expect(c.indice).toBe(false)
  })

  it('un dedo bien doblado (60°) sí cuenta como cerrado', () => {
    const c = dedosCerrados(manoCon({ indice: 60, medio: 60, anillo: 60 }))
    expect(c.indice).toBe(true)
    expect(c.medio).toBe(true)
    expect(c.anillo).toBe(true)
  })
})

describe('llamada: no se dispara por dedos a medio doblar', () => {
  it('una mano plana NO es una llamada', () => {
    const r = clasificarReglas(entrada(manoCon({ indice: 175, medio: 175, anillo: 175, menique: 175, pulgar: true })))
    expect(r.gesto).not.toBe('llamada')
  })

  it('una mano con los dedos "casi rectos" (140°) tampoco es una llamada', () => {
    // El falso positivo típico: al hacer el saludo, el ruido bajaba algún dedo
    // por debajo de 150 y la regla lo tomaba por una llamada.
    const r = clasificarReglas(
      entrada(manoCon({ indice: 140, medio: 145, anillo: 142, menique: 175, pulgar: true })),
    )
    expect(r.gesto).not.toBe('llamada')
  })

  it('una llamada de verdad (pulgar y meñique arriba, resto doblado) sí se detecta', () => {
    const r = clasificarReglas(
      entrada(manoCon({ indice: 55, medio: 50, anillo: 45, menique: 170, pulgar: true })),
    )
    expect(r.gesto).toBe('llamada')
  })
})

describe('zona muerta: la mano plana se reconoce aunque los dedos no estén perfectos', () => {
  it('con dedos a 145° la mano se considera plana (indice, medio y un tercero)', () => {
    // Este es el caso que rompía el saludo: con el umbral viejo de 150 un dedo
    // a 145° contaba como cerrado y la mano dejaba de ser "plana".
    const mano = manoCon({ indice: 145, medio: 145, anillo: 145, menique: 176 })
    const e = extensionesRegla(mano)
    expect(e.indice).toBe(true)
    expect(e.medio).toBe(true)
    expect(e.anillo).toBe(true)
  })
})
