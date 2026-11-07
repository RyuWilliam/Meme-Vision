import { describe, expect, it } from 'vitest'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { clasificarReglas } from './reglas.ts'
import { ROSTRO } from './caracteristicas.ts'
import type { EntradaCuadro } from './tipos.ts'

const p = (x: number, y: number, z = 0): NormalizedLandmark => ({ x, y, z, visibility: 1 })

function manoCon(indicePos: [number, number], medioPos: [number, number], plana: boolean) {
  const m = Array.from({ length: 21 }, () => p(0.5, 0.5))
  m[0] = p(0.5, 0.6)
  m[1] = p(0.46, 0.56)
  m[2] = p(0.44, 0.54)
  m[3] = p(0.45, 0.52)
  m[4] = p(0.46, 0.51)
  const dedos = [
    { base: 5, x: 0.47, ext: true },
    { base: 9, x: 0.5, ext: true },
    { base: 13, x: 0.53, ext: plana },
    { base: 17, x: 0.56, ext: plana },
  ]
  for (const d of dedos) {
    m[d.base] = p(d.x, 0.45)
    m[d.base + 1] = p(d.x, 0.4)
    m[d.base + 2] = p(d.x, d.ext ? 0.35 : 0.42)
    m[d.base + 3] = p(d.x, d.ext ? 0.3 : 0.44)
  }
  const colocar = (base: number, pos: [number, number]) => {
    const mcp = m[base]
    m[base + 1] = p(mcp.x + (pos[0] - mcp.x) / 3, mcp.y + (pos[1] - mcp.y) / 3)
    m[base + 2] = p(mcp.x + (2 * (pos[0] - mcp.x)) / 3, mcp.y + (2 * (pos[1] - mcp.y)) / 3)
    m[base + 3] = p(pos[0], pos[1])
  }
  colocar(5, indicePos)
  colocar(9, medioPos)
  return m
}

function rostro(): NormalizedLandmark[] {
  const r = Array.from({ length: 478 }, () => p(0.5, 0.5))
  r[ROSTRO.frente] = p(0.5, 0.2)
  r[ROSTRO.labioSuperior] = p(0.5, 0.55)
  r[ROSTRO.labioInferior] = p(0.5, 0.57)
  r[ROSTRO.menton] = p(0.5, 0.8)
  r[ROSTRO.mandibulaIzquierda] = p(0.35, 0.6)
  r[ROSTRO.mandibulaDerecha] = p(0.65, 0.6)
  r[ROSTRO.sienDerecha] = p(0.32, 0.35)
  r[ROSTRO.sienIzquierda] = p(0.68, 0.35)
  r[ROSTRO.ojoDerechoArriba] = p(0.4, 0.4)
  r[ROSTRO.ojoIzquierdoArriba] = p(0.6, 0.4)
  return r
}

const evaluar = (indicePos: [number, number], medioPos: [number, number], plana = true): EntradaCuadro => ({
  mano: manoCon(indicePos, medioPos, plana),
  manoEtiqueta: 'Right',
  rostro: rostro(),
  blendshapes: null,
})

describe('saludo militar: cobertura tras el arreglo', () => {
  it('detecta el saludo en la sien derecha', () => {
    const r = clasificarReglas(evaluar([0.33, 0.34], [0.38, 0.3]))
    expect(r.gesto).toBe('saludo')
  })

  it('detecta el saludo en la sien izquierda', () => {
    // Espejo del caso anterior sobre la otra sien (0.68, 0.35).
    const r = clasificarReglas(evaluar([0.67, 0.34], [0.62, 0.3]))
    expect(r.gesto).toBe('saludo')
  })

  it('detecta el saludo con la mano un poco separada de la sien', () => {
    // Tolerancia realista: la mano no siempre queda pegada.
    const r = clasificarReglas(evaluar([0.35, 0.36], [0.41, 0.32]))
    expect(r.gesto).toBe('saludo')
  })

  it('rechaza una "V" (dos dedos) en la sien', () => {
    const r = clasificarReglas(evaluar([0.33, 0.34], [0.38, 0.3], false))
    expect(r.gesto).not.toBe('saludo')
  })

  it('rechaza la palma abierta lejos de la sien', () => {
    const r = clasificarReglas(evaluar([0.5, 0.55], [0.55, 0.55]))
    expect(r.gesto).not.toBe('saludo')
  })
})
