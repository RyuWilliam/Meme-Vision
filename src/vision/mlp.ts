import type { GestoId, ModeloMlp } from './tipos.ts'
import { TAMANO_ENTRADA } from './tipos.ts'

export interface PrediccionMlp {
  gesto: GestoId
  confianza: number
  probabilidades: number[]
}

export async function cargarModelo(
  url = '/modelos/gestos_mlp.json',
): Promise<ModeloMlp | null> {
  try {
    const respuesta = await fetch(url, { cache: 'no-store' })
    if (!respuesta.ok) return null
    const modelo = (await respuesta.json()) as ModeloMlp
    return validarModelo(modelo) ? modelo : null
  } catch {
    return null
  }
}

export function validarModelo(modelo: ModeloMlp): boolean {
  if (!modelo || modelo.tamano_entrada !== TAMANO_ENTRADA) return false
  if (!Array.isArray(modelo.gestos) || modelo.gestos.length === 0) return false
  if (!Array.isArray(modelo.capas) || modelo.capas.length === 0) return false
  if (modelo.escalador.media.length !== TAMANO_ENTRADA) return false
  if (modelo.escalador.desviacion.length !== TAMANO_ENTRADA) return false

  const ultima = modelo.capas[modelo.capas.length - 1]
  if (ultima.sesgos.length !== modelo.gestos.length) return false

  let entradas = modelo.tamano_entrada
  for (const capa of modelo.capas) {
    const salidas = capa.sesgos.length
    if (salidas === 0 || capa.pesos.length !== salidas) return false
    if (capa.pesos.some(fila => fila.length !== entradas)) return false
    entradas = salidas
  }
  return entradas === modelo.gestos.length
}

export function predecir(modelo: ModeloMlp, caracteristicas: ArrayLike<number>): PrediccionMlp {
  if (caracteristicas.length !== modelo.tamano_entrada) {
    throw new Error(
      `El modelo espera ${modelo.tamano_entrada} características y llegaron ${caracteristicas.length}.`,
    )
  }

  let entrada = new Array<number>(modelo.tamano_entrada)
  for (let i = 0; i < modelo.tamano_entrada; i++) {
    const desviacion = modelo.escalador.desviacion[i]
    entrada[i] =
      (Number(caracteristicas[i]) - modelo.escalador.media[i]) /
      (Math.abs(desviacion) < 1e-8 ? 1 : desviacion)
  }

  for (let capa = 0; capa < modelo.capas.length; capa++) {
    const { pesos, sesgos } = modelo.capas[capa]
    const salida = new Array<number>(sesgos.length)
    for (let j = 0; j < sesgos.length; j++) {
      let suma = sesgos[j]
      const fila = pesos[j]
      for (let i = 0; i < entrada.length; i++) suma += fila[i] * entrada[i]
      salida[j] = capa === modelo.capas.length - 1 ? suma : Math.max(0, suma)
    }
    entrada = capa === modelo.capas.length - 1 ? softmax(salida) : salida
  }

  let indice = 0
  for (let i = 1; i < entrada.length; i++) if (entrada[i] > entrada[indice]) indice = i
  return {
    gesto: modelo.gestos[indice],
    confianza: entrada[indice],
    probabilidades: entrada,
  }
}

function softmax(valores: number[]): number[] {
  const maximo = Math.max(...valores)
  const exponenciales = valores.map(valor => Math.exp(valor - maximo))
  const suma = exponenciales.reduce((total, valor) => total + valor, 0) || 1
  return exponenciales.map(valor => valor / suma)
}
