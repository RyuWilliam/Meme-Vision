import { distancia2, distanciaASegmento, extensiones } from './mano.ts'
import type { EntradaCuadro, GestoId, GestoIntegrado } from './tipos.ts'
import { ROSTRO } from './caracteristicas.ts'
export interface ResultadoReglas {
  gesto: GestoId
  confianza: number
}

const SIN_GESTO: ResultadoReglas = { gesto: 'ninguno', confianza: 0 }

/**
 * Motor de reglas geométricas. Sirve para que la app funcione desde el primer
 * día, antes de recolectar el dataset, y como respaldo cuando el MLP no está
 * seguro. Cuando exista `gestos_mlp.json`, el MLP tiene prioridad.
 */
export function clasificarReglas(
  entrada: EntradaCuadro,
  integrado?: GestoIntegrado | null,
): ResultadoReglas {
  const mano = entrada.mano
  if (!mano || mano.length < 21) return SIN_GESTO

  const ext = extensiones(mano)
  const soloIndice = ext.indice && !ext.medio && !ext.anillo && !ext.menique
  // Mano plana o semiplana: índice y medio extendidos, los demás pueden variar.
  const manoAbierta = ext.indice && ext.medio
  const rostro = entrada.rostro

  if (rostro && rostro.length > ROSTRO.mandibulaDerecha) {
    const escala =
      distancia2(rostro[ROSTRO.frente], rostro[ROSTRO.menton]) || 1
    const indice = mano[8]
    const medio = mano[12]

    // Saludo militar: la mano va a la sien. Se pide que índice y medio estén
    // extendidos y que las puntas queden cerca de una sien y por encima de la
    // línea de los ojos, para no confundirlo con silencio o mewing.
    //
    // Antes esta condición exigía además anillo y meñique CERRADOS, que es
    // exactamente el gesto de paz (V). Un saludo militar real lleva la mano
    // plana, así que nunca entraba: la única forma de activarlo era hacer una
    // "V" en la sien. Ahora se pide lo contrario: que al menos uno de los otros
    // dos dedos acompañe. Así la "V" de dos dedos queda descartada y la mano
    // plana (tres o cuatro dedos) sí se reconoce.
    const manoPlana = ext.anillo || ext.menique
    if (manoAbierta && manoPlana) {
      const sienes = [rostro[ROSTRO.sienDerecha], rostro[ROSTRO.sienIzquierda]]
      const lineaOjos =
        (rostro[ROSTRO.ojoDerechoArriba].y + rostro[ROSTRO.ojoIzquierdoArriba].y) / 2
      const puntas = [indice, medio]
      let mejorSien = Number.POSITIVE_INFINITY
      for (const sien of sienes) {
        // Punta más cercana a esa sien; la otra debe acompañar.
        const a = distancia2(puntas[0], sien) / escala
        const b = distancia2(puntas[1], sien) / escala
        mejorSien = Math.min(mejorSien, Math.max(a, b))
      }
      const arribaDeLosOjos = indice.y < lineaOjos + 0.04 * escala
      // Condición lateral: la mano tiene que ir HACIA LA OREJA, no quedarse
      // centrada en la frente. Sin esto, taparse el sol con la palma delante
      // de la frente también entraba: la sien queda lo bastante cerca en
      // distancia euclídea aunque la mano esté en el centro de la cara.
      //
      // Se mide qué tan lejos del centro de la cara está cada punta, en
      // unidades de media anchura de cara (centro → sien). 0 es la nariz y 1
      // la sien. Un saludo real ronda 0.7–0.8; una palma al centro, 0.
      const centroX =
        (rostro[ROSTRO.sienDerecha].x + rostro[ROSTRO.sienIzquierda].x) / 2
      const medioAncho =
        Math.abs(rostro[ROSTRO.sienIzquierda].x - rostro[ROSTRO.sienDerecha].x) / 2 || 1
      const lateral =
        ((Math.abs(indice.x - centroX) + Math.abs(medio.x - centroX)) / 2) / medioAncho
      // Las dos puntas deben estar del mismo lado de la cara: si una cruza al
      // otro lado, la mano está tapando la cara, no saludando.
      const mismoLado = (indice.x - centroX) * (medio.x - centroX) > 0
      // 0.5 = al menos a mitad de camino entre el centro de la frente y la
      // oreja. Así el gesto empieza a contar desde media frente hacia afuera.
      const haciaLaOreja = mismoLado && lateral >= 0.5
      // 0.26 de la altura de la cara desde la sien. Antes el umbral era 0.34,
      // que en la práctica aceptaba cualquier palma abierta delante de la
      // frente (una palma centrada da ~0.31). Un saludo real queda en ~0.13,
      // así que 0.26 deja margen para la mano un poco separada sin falsos
      // positivos de palma abierta.
      if (mejorSien < 0.26 && arribaDeLosOjos && medio.y < lineaOjos && haciaLaOreja) {
        return {
          gesto: 'saludo',
          confianza: 0.78 + 0.18 * (1 - Math.min(1, mejorSien / 0.34)),
        }
      }
    }

    if (soloIndice) {
      const boca = {
        x: (rostro[ROSTRO.labioSuperior].x + rostro[ROSTRO.labioInferior].x) / 2,
        y: (rostro[ROSTRO.labioSuperior].y + rostro[ROSTRO.labioInferior].y) / 2,
        z: 0,
      }
      const aBoca = distancia2(indice, boca) / escala
      const aMandibula =
        Math.min(
          distanciaASegmento(indice, rostro[ROSTRO.mandibulaIzquierda], rostro[ROSTRO.menton]),
          distanciaASegmento(indice, rostro[ROSTRO.mandibulaDerecha], rostro[ROSTRO.menton]),
        ) / escala
      const debajoDeLaBoca = indice.y > boca.y + 0.05 * escala

      // Silencio: el índice está prácticamente sobre los labios.
      if (aBoca < 0.18) {
        return { gesto: 'silencio', confianza: 0.8 + 0.16 * (1 - Math.min(1, aBoca / 0.18)) }
      }

      // Mewing: índice tocando la mandíbula, por debajo de la boca.
      if (debajoDeLaBoca && aMandibula < 0.30) {
        return { gesto: 'mewing', confianza: 0.76 + 0.18 * (1 - Math.min(1, aMandibula / 0.30)) }
      }

      // Silencio algo menos preciso (índice cerca de la boca).
      if (aBoca < 0.34) {
        return { gesto: 'silencio', confianza: 0.7 + 0.1 * (1 - Math.min(1, aBoca / 0.34)) }
      }
    }
  }

  // Llamada: pulgar y meñique extendidos, el resto cerrado.
  if (ext.pulgar && ext.menique && !ext.indice && !ext.medio && !ext.anillo) {
    return { gesto: 'llamada', confianza: 0.9 }
  }

  // Like/Dislike: primero el gesto integrado de MediaPipe (más robusto a la
  // rotación). Después, la geometría como respaldo.
  if (integrado?.nombre === 'Thumb_Up' && integrado.confianza > 0.5) {
    return { gesto: 'like', confianza: Math.max(0.7, integrado.confianza) }
  }
  if (integrado?.nombre === 'Thumb_Down' && integrado.confianza > 0.5) {
    return { gesto: 'dislike', confianza: Math.max(0.7, integrado.confianza) }
  }

  if (ext.pulgar && !ext.indice && !ext.medio && !ext.anillo && !ext.menique) {
    const escala = distancia2(mano[0], mano[9]) || 1
    if (mano[4].y < mano[0].y - 0.15 * escala) {
      return { gesto: 'like', confianza: 0.78 }
    }
    if (mano[4].y > mano[0].y + 0.15 * escala) {
      return { gesto: 'dislike', confianza: 0.78 }
    }
  }

  return SIN_GESTO
}
