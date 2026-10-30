import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

/**
 * Gestos que reconoce MemeVision.
 * Las etiquetas coinciden exactamente con las del entrenamiento en Python
 * (`nucleo/src/meme_vision/configuracion.py`).
 */
export type GestoId = 'like' | 'llamada' | 'silencio' | 'mewing' | 'ninguno'

export interface GestoConfig {
  etiqueta: string
  carpeta: string
  emoji: string
}

export const GESTOS: Record<GestoId, GestoConfig> = {
  like: { etiqueta: 'Like', carpeta: 'like', emoji: '👍' },
  llamada: { etiqueta: 'Llamada', carpeta: 'llamada', emoji: '📞' },
  silencio: { etiqueta: 'Silencio', carpeta: 'silencio', emoji: '🤫' },
  mewing: { etiqueta: 'Mewing', carpeta: 'mewing', emoji: '😼' },
  ninguno: { etiqueta: 'Sin gesto', carpeta: '_sin_gesto', emoji: '👀' },
}

/** Orden que usa Python al entrenar; el JSON del modelo manda sobre este orden. */
export const ETIQUETAS_ENTRENAMIENTO: GestoId[] = [
  'like',
  'llamada',
  'silencio',
  'mewing',
  'ninguno',
]

/** Las 52 categorías de blendshapes de MediaPipe, en orden canónico. */
export const CATEGORIAS_ROSTRO = [
  '_neutral',
  'browDownLeft',
  'browDownRight',
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',
  'cheekPuff',
  'cheekSquintLeft',
  'cheekSquintRight',
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'eyeLookDownLeft',
  'eyeLookDownRight',
  'eyeLookInLeft',
  'eyeLookInRight',
  'eyeLookOutLeft',
  'eyeLookOutRight',
  'eyeLookUpLeft',
  'eyeLookUpRight',
  'eyeSquintLeft',
  'eyeSquintRight',
  'eyeWideLeft',
  'eyeWideRight',
  'jawForward',
  'jawLeft',
  'jawOpen',
  'jawRight',
  'mouthClose',
  'mouthDimpleLeft',
  'mouthDimpleRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'mouthFunnel',
  'mouthLeft',
  'mouthLowerDownLeft',
  'mouthLowerDownRight',
  'mouthPressLeft',
  'mouthPressRight',
  'mouthPucker',
  'mouthRight',
  'mouthRollLower',
  'mouthRollUpper',
  'mouthShrugLower',
  'mouthShrugUpper',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthStretchLeft',
  'mouthStretchRight',
  'mouthUpperUpLeft',
  'mouthUpperUpRight',
  'noseSneerLeft',
  'noseSneerRight',
] as const

export const TAMANO_ENTRADA =
  21 * 3 /* mano */ + CATEGORIAS_ROSTRO.length /* blendshapes */ + 8 /* geometría */ + 4 /* flags */

/** Lo que devuelve MediaPipe en un fotograma, listo para convertir a features. */
export interface EntradaCuadro {
  mano: NormalizedLandmark[] | null
  manoEtiqueta: string | null
  rostro: NormalizedLandmark[] | null
  blendshapes: Record<string, number> | null
}

export interface GestoIntegrado {
  nombre: string
  confianza: number
}

export interface DeteccionGesto {
  gesto: GestoId
  confianza: number
  origen: 'mlp' | 'reglas'
  mano: boolean
  rostro: boolean
  integrado: GestoIntegrado | null
}

/** Formato de `public/modelos/gestos_mlp.json`, exportado por el núcleo Python. */
export interface ModeloMlp {
  version: string
  creado: string
  gestos: GestoId[]
  tamano_entrada: number
  categorias_rostro: string[]
  escalador: { media: number[]; desviacion: number[] }
  /** Cada capa tiene pesos con forma [salidas][entradas] y sesgos [salidas]. */
  capas: Array<{ pesos: number[][]; sesgos: number[] }>
  umbral: number
  metricas?: Record<string, unknown>
}
