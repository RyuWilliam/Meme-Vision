import { FaceLandmarker, FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision'
import type { Category } from '@mediapipe/tasks-vision'
import { extraerCaracteristicas } from './caracteristicas.ts'
import { cargarModelo, predecir } from './mlp.ts'
import { clasificarReglas } from './reglas.ts'
import type { DeteccionGesto, EntradaCuadro, GestoIntegrado, ModeloMlp } from './tipos.ts'

export interface ResultadoCuadro {
  deteccion: DeteccionGesto
  entrada: EntradaCuadro
}

type Vision = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>

const BASE = import.meta.env.BASE_URL

export class MotorGestos {
  private readonly reconocedor: GestureRecognizer
  private readonly rostro: FaceLandmarker
  private readonly modelo: ModeloMlp | null
  private ultimoTimestamp = 0

  private constructor(
    reconocedor: GestureRecognizer,
    rostro: FaceLandmarker,
    modelo: ModeloMlp | null,
  ) {
    this.reconocedor = reconocedor
    this.rostro = rostro
    this.modelo = modelo
  }

  static async crear(): Promise<MotorGestos> {
    const vision = await FilesetResolver.forVisionTasks(`${BASE}wasm/tasks-vision`)

    let tareas: { reconocedor: GestureRecognizer; rostro: FaceLandmarker }
    try {
      tareas = await crearTareas(vision, 'GPU')
    } catch (error) {
      console.warn('MediaPipe GPU no disponible; se reintenta en CPU.', error)
      tareas = await crearTareas(vision, 'CPU')
    }

    const modelo = await cargarModelo(`${BASE}modelos/gestos_mlp.json`)
    return new MotorGestos(tareas.reconocedor, tareas.rostro, modelo)
  }

  get modo(): 'mlp' | 'reglas' {
    return this.modelo ? 'mlp' : 'reglas'
  }

  get umbral(): number {
    return this.modelo?.umbral ?? 0.6
  }

  get detalleModelo(): string {
    return this.modelo ? `MLP ${this.modelo.version}` : 'reglas (sin modelo entrenado)'
  }

  detectar(video: HTMLVideoElement, timestamp: number): ResultadoCuadro | null {
    if (video.readyState < 2 || video.videoWidth === 0) return null

    // MediaPipe exige timestamps estrictamente crecientes.
    const ahora = Math.max(Math.floor(timestamp), this.ultimoTimestamp + 1)
    this.ultimoTimestamp = ahora

    const manos = this.reconocedor.recognizeForVideo(video, ahora)
    const caras = this.rostro.detectForVideo(video, ahora)

    const mano = manos.landmarks?.[0] ?? null
    const manoEtiqueta = manos.handedness?.[0]?.[0]?.categoryName ?? null
    const rostro = caras.faceLandmarks?.[0] ?? null
    const blendshapes = aDiccionario(caras.faceBlendshapes?.[0]?.categories)

    const integrado = aGestoIntegrado(manos.gestures?.[0]?.[0])
    const entrada: EntradaCuadro = { mano, manoEtiqueta, rostro, blendshapes }

    const reglas = clasificarReglas(entrada, integrado)

    let deteccion: DeteccionGesto
    if (this.modelo) {
      let mlp: ReturnType<typeof predecir> | null = null
      try {
        mlp = predecir(
          this.modelo,
          extraerCaracteristicas(entrada, this.modelo.categorias_rostro),
        )
      } catch (error) {
        console.warn('Fallo la inferencia del MLP; se usan reglas.', error)
      }

      if (mlp && mlp.confianza >= this.modelo.umbral) {
        deteccion = {
          gesto: mlp.gesto,
          confianza: mlp.confianza,
          origen: 'mlp',
          mano: !!mano,
          rostro: !!rostro,
          integrado,
        }
      } else if (reglas.gesto !== 'ninguno') {
        deteccion = { ...reglas, origen: 'reglas', mano: !!mano, rostro: !!rostro, integrado }
      } else if (mlp) {
        deteccion = {
          gesto: mlp.gesto,
          confianza: mlp.confianza,
          origen: 'mlp',
          mano: !!mano,
          rostro: !!rostro,
          integrado,
        }
      } else {
        deteccion = { ...reglas, origen: 'reglas', mano: !!mano, rostro: !!rostro, integrado }
      }
    } else {
      deteccion = { ...reglas, origen: 'reglas', mano: !!mano, rostro: !!rostro, integrado }
    }

    return { deteccion, entrada }
  }

  cerrar(): void {
    this.reconocedor.close()
    this.rostro.close()
  }
}

async function crearTareas(
  vision: Vision,
  delegate: 'GPU' | 'CPU',
): Promise<{ reconocedor: GestureRecognizer; rostro: FaceLandmarker }> {
  let reconocedor: GestureRecognizer | null = null
  let rostro: FaceLandmarker | null = null
  try {
    reconocedor = await GestureRecognizer.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `${BASE}modelos/gesture_recognizer.task`,
        delegate,
      },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
    rostro = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `${BASE}modelos/face_landmarker.task`,
        delegate,
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
    })
    return { reconocedor, rostro }
  } catch (error) {
    reconocedor?.close()
    rostro?.close()
    throw error
  }
}

function aDiccionario(categorias: Category[] | undefined): Record<string, number> | null {
  if (!categorias || categorias.length === 0) return null
  const salida: Record<string, number> = {}
  for (const categoria of categorias) salida[categoria.categoryName] = categoria.score
  return salida
}

function aGestoIntegrado(categoria: Category | undefined): GestoIntegrado | null {
  if (!categoria || categoria.categoryName === 'None') return null
  return { nombre: categoria.categoryName, confianza: categoria.score }
}
