import { FaceLandmarker, FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision'
import type { Category } from '@mediapipe/tasks-vision'
import { extraerCaracteristicas } from './caracteristicas.ts'
import { extraerCaracteristicasMano } from './caracteristicas-mano.ts'
import { combinarDeteccion } from './fusion.ts'
import { cargarModelo, predecir } from './mlp.ts'
import { clasificarReglas } from './reglas.ts'
import { TAMANO_ENTRADA_MANO } from './tipos.ts'
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
  private readonly modeloMano: ModeloMlp | null
  private readonly modeloRostro: ModeloMlp | null
  private ultimoTimestamp = 0

  private constructor(
    reconocedor: GestureRecognizer,
    rostro: FaceLandmarker,
    modeloMano: ModeloMlp | null,
    modeloRostro: ModeloMlp | null,
  ) {
    this.reconocedor = reconocedor
    this.rostro = rostro
    this.modeloMano = modeloMano
    this.modeloRostro = modeloRostro
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

    const [modeloMano, modeloRostro] = await Promise.all([
      cargarModelo(`${BASE}modelos/gestos_mano_mlp.json`, TAMANO_ENTRADA_MANO),
      cargarModelo(`${BASE}modelos/gestos_mlp.json`),
    ])
    return new MotorGestos(tareas.reconocedor, tareas.rostro, modeloMano, modeloRostro)
  }

  get modo(): 'mlp' | 'reglas' {
    return this.modeloMano || this.modeloRostro ? 'mlp' : 'reglas'
  }

  get umbral(): number {
    return this.modeloMano?.umbral ?? this.modeloRostro?.umbral ?? 0.6
  }

  get detalleModelo(): string {
    const partes: string[] = []
    if (this.modeloMano) partes.push(`mano ${this.modeloMano.version}`)
    if (this.modeloRostro) partes.push(`rostro ${this.modeloRostro.version}`)
    return partes.length ? `MLP ${partes.join(' + ')}` : 'reglas (sin modelo entrenado)'
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

    let mlpMano: ReturnType<typeof predecir> | null = null
    if (this.modeloMano) {
      try {
        mlpMano = predecir(this.modeloMano, extraerCaracteristicasMano(entrada))
      } catch (error) {
        console.warn('Fallo la inferencia del MLP de mano; se usan reglas.', error)
      }
    }

    let mlpRostro: ReturnType<typeof predecir> | null = null
    if (this.modeloRostro) {
      try {
        mlpRostro = predecir(
          this.modeloRostro,
          extraerCaracteristicas(entrada, this.modeloRostro.categorias_rostro),
        )
      } catch (error) {
        console.warn('Fallo la inferencia del MLP de rostro; se usan reglas.', error)
      }
    }

    const deteccion = combinarDeteccion({
      reglas,
      mlpMano,
      mlpRostro,
      umbralMano: this.modeloMano?.umbral ?? 1,
      umbralRostro: this.modeloRostro?.umbral ?? 1,
      mano: !!mano,
      rostro: !!rostro,
      integrado,
    })

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
