import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

/**
 * Gestos que reconoce MemeVision.
 * Las etiquetas coinciden exactamente con las del entrenamiento en Python
 * (`nucleo/src/meme_vision/configuracion.py`).
 */
export type GestoId =
  | 'like'
  | 'llamada'
  | 'silencio'
  | 'mewing'
  | 'saludo'
  | 'ok'
  | 'peace'
  | 'rock'
  | 'fist'
  | 'palm'
  | 'stop'
  | 'one'
  | 'dislike'
  | 'pistola'
  | 'ninguno'

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
  saludo: { etiqueta: 'Saludo militar', carpeta: 'saludo', emoji: '🫡' },
  ok: { etiqueta: 'OK', carpeta: 'ok', emoji: '👌' },
  peace: { etiqueta: 'Paz', carpeta: 'peace', emoji: '✌️' },
  rock: { etiqueta: 'Rock', carpeta: 'rock', emoji: '🤘' },
  fist: { etiqueta: 'Puño', carpeta: 'fist', emoji: '✊' },
  palm: { etiqueta: 'Palma', carpeta: 'palm', emoji: '🖐️' },
  stop: { etiqueta: 'Stop', carpeta: 'stop', emoji: '✋' },
  one: { etiqueta: 'Uno', carpeta: 'one', emoji: '☝️' },
  pistola: { etiqueta: 'Pistola', carpeta: 'pistola', emoji: '🔫' },
  dislike: { etiqueta: 'Dislike', carpeta: 'dislike', emoji: '👎' },
  ninguno: { etiqueta: 'Sin gesto', carpeta: '_sin_gesto', emoji: '👀' },
}

/** Orden que usa Python al entrenar el modelo de rostro (127 features). */
export const ETIQUETAS_ENTRENAMIENTO: GestoId[] = [
  'like',
  'llamada',
  'silencio',
  'mewing',
  'ninguno',
]

/**
 * Clases del modelo de mano (69 features). `like` y `dislike` se resuelven con
 * las reglas de MediaPipe; `silencio`, `mewing` y `saludo` necesitan el rostro
 * y también los resuelve el motor de reglas.
 */
export const GESTOS_MANO: GestoId[] = [
  'llamada',
  'ok',
  'peace',
  'rock',
  'fist',
  'palm',
  'stop',
  'one',
  'pistola',
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

/** 63 coordenadas canónicas + mano presente + 5 flags de dedos. */
export const TAMANO_ENTRADA_MANO = 21 * 3 + 6

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
  origen: 'mlp' | 'mlp-mano' | 'reglas'
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
