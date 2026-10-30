import type { DeteccionGesto, GestoId } from './tipos.ts'

export interface OpcionesEstabilizador {
  ventana?: number
  minimo?: number
  confianzaMinima?: number
  cooldownMs?: number
  retencionMs?: number
}

export interface EstadoEstable {
  gesto: GestoId
  confianza: number
  cambio: boolean
}

/**
 * Evita que el meme parpadee: un gesto solo se acepta si aparece en `minimo` de
 * los últimos `ventana` fotogramas, con confianza suficiente. Al perder el gesto
 * se mantiene `retencionMs` antes de volver a "sin gesto", y hay un cooldown
 * entre cambios.
 */
export class Estabilizador {
  private readonly ventana: number
  private readonly minimo: number
  private readonly confianzaMinima: number
  private readonly cooldownMs: number
  private readonly retencionMs: number
  private historial: GestoId[] = []
  private estable: GestoId = 'ninguno'
  private confianza = 0
  private ultimoCambio = Number.NEGATIVE_INFINITY
  private ultimoVisto = 0

  constructor(opciones: OpcionesEstabilizador = {}) {
    this.ventana = opciones.ventana ?? 8
    this.minimo = opciones.minimo ?? 5
    this.confianzaMinima = opciones.confianzaMinima ?? 0.6
    this.cooldownMs = opciones.cooldownMs ?? 1200
    this.retencionMs = opciones.retencionMs ?? 2000
  }

  actualizar(deteccion: DeteccionGesto, ahora: number): EstadoEstable {
    const observado: GestoId =
      deteccion.confianza >= this.confianzaMinima ? deteccion.gesto : 'ninguno'
    this.historial.push(observado)
    if (this.historial.length > this.ventana) this.historial.shift()

    const conteo = new Map<GestoId, number>()
    for (const gesto of this.historial) conteo.set(gesto, (conteo.get(gesto) ?? 0) + 1)

    let candidato: GestoId = 'ninguno'
    let maximo = 0
    for (const [gesto, cantidad] of conteo) {
      if (cantidad > maximo) {
        candidato = gesto
        maximo = cantidad
      }
    }

    let cambio = false
    if (candidato !== this.estable) {
      const retenido =
        candidato === 'ninguno' && ahora - this.ultimoVisto < this.retencionMs
      const enEspera =
        this.estable !== 'ninguno' && ahora - this.ultimoCambio < this.cooldownMs

      if (!retenido && !enEspera && maximo >= this.minimo) {
        this.estable = candidato
        this.ultimoCambio = ahora
        cambio = true
      }
    }

    if (candidato === this.estable && candidato !== 'ninguno') {
      this.ultimoVisto = ahora
    }
    if (this.estable !== 'ninguno' && ahora - this.ultimoVisto > this.retencionMs) {
      this.estable = 'ninguno'
      this.ultimoCambio = ahora
      cambio = true
    }

    if (cambio || candidato === this.estable) this.confianza = deteccion.confianza
    return { gesto: this.estable, confianza: this.confianza, cambio }
  }

  reiniciar(): void {
    this.historial = []
    this.estable = 'ninguno'
    this.confianza = 0
    this.ultimoCambio = Number.NEGATIVE_INFINITY
    this.ultimoVisto = 0
  }

  get gestoActual(): GestoId {
    return this.estable
  }
}
