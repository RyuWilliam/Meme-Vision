import { describe, expect, it } from 'vitest'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { clasificarReglas } from './reglas.ts'
import { ROSTRO } from './caracteristicas.ts'
import type { EntradaCuadro } from './tipos.ts'

const p = (x: number, y: number, z = 0): NormalizedLandmark => ({ x, y, z, visibility: 1 })

interface OpcionesMano {
  pulgar?: boolean
  indice?: boolean
  medio?: boolean
  anillo?: boolean
  menique?: boolean
  indicePos?: [number, number]
}

function mano(opciones: OpcionesMano): NormalizedLandmark[] {
  const m = Array.from({ length: 21 }, () => p(0.5, 0.5))
  m[0] = p(0.5, 0.6)

  if (opciones.pulgar) {
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

  const dedos: Array<{ base: number; x: number; extendido: boolean }> = [
    { base: 5, x: 0.47, extendido: !!opciones.indice },
    { base: 9, x: 0.5, extendido: !!opciones.medio },
    { base: 13, x: 0.53, extendido: !!opciones.anillo },
    { base: 17, x: 0.56, extendido: !!opciones.menique },
  ]
  for (const dedo of dedos) {
    m[dedo.base] = p(dedo.x, 0.45)
    m[dedo.base + 1] = p(dedo.x, 0.4)
    if (dedo.extendido) {
      m[dedo.base + 2] = p(dedo.x, 0.35)
      m[dedo.base + 3] = p(dedo.x, 0.3)
    } else {
      m[dedo.base + 2] = p(dedo.x, 0.42)
      m[dedo.base + 3] = p(dedo.x, 0.44)
    }
  }
  if (opciones.indicePos) {
    const mcp = m[5]
    const [tx, ty] = opciones.indicePos
    m[6] = p(mcp.x + (tx - mcp.x) / 3, mcp.y + (ty - mcp.y) / 3)
    m[7] = p(mcp.x + (2 * (tx - mcp.x)) / 3, mcp.y + (2 * (ty - mcp.y)) / 3)
    m[8] = p(tx, ty)
  }
  return m
}

function rostro(): NormalizedLandmark[] {
  const puntos = Array.from({ length: 478 }, () => p(0.5, 0.5))
  puntos[ROSTRO.frente] = p(0.5, 0.2)
  puntos[ROSTRO.labioSuperior] = p(0.5, 0.55)
  puntos[ROSTRO.labioInferior] = p(0.5, 0.57)
  puntos[ROSTRO.menton] = p(0.5, 0.8)
  puntos[ROSTRO.mandibulaIzquierda] = p(0.35, 0.6)
  puntos[ROSTRO.mandibulaDerecha] = p(0.65, 0.6)
  return puntos
}

function entrada(opciones: OpcionesMano): EntradaCuadro {
  return {
    mano: mano(opciones),
    manoEtiqueta: 'Right',
    rostro: rostro(),
    blendshapes: null,
  }
}

describe('reglas geométricas', () => {
  it('reconoce like con el gesto integrado', () => {
    const resultado = clasificarReglas(entrada({ pulgar: true }), {
      nombre: 'Thumb_Up',
      confianza: 0.93,
    })
    expect(resultado.gesto).toBe('like')
    expect(resultado.confianza).toBeGreaterThan(0.8)
  })

  it('reconoce llamada', () => {
    const resultado = clasificarReglas(entrada({ pulgar: true, menique: true }))
    expect(resultado.gesto).toBe('llamada')
  })

  it('reconoce silencio con el índice en los labios', () => {
    const resultado = clasificarReglas(
      entrada({ indice: true, indicePos: [0.5, 0.555] }),
    )
    expect(resultado.gesto).toBe('silencio')
  })

  it('reconoce mewing con el índice en la mandíbula', () => {
    const resultado = clasificarReglas(
      entrada({ indice: true, indicePos: [0.42, 0.68] }),
    )
    expect(resultado.gesto).toBe('mewing')
  })

  it('no inventa gestos con la mano abierta', () => {
    const resultado = clasificarReglas(
      entrada({ pulgar: true, indice: true, medio: true, anillo: true, menique: true }),
    )
    expect(resultado.gesto).toBe('ninguno')
  })
})
