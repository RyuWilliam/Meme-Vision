import { dedosCerrados, distancia2, distanciaASegmento, extensionesRegla } from './mano.ts'
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

  const ext = extensionesRegla(mano)
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
      // Saludo militar real: mano plana y HORIZONTAL, palma hacia el suelo, la
      // muñeca junto a la oreja y las PUNTAS hacia el centro de la frente. Desde
      // la cámara se ve el perfil del meñique.
      //
      // El invariante más fiable es dónde caen las puntas: en un saludo real
      // quedan sobre el centro de la frente. La versión anterior medía la
      // distancia de las puntas a la SIEN (al revés), así que rechazaba un
      // saludo bien hecho y en cambio aceptaba poner la mano de pie delante de
      // la cara, que es el gesto de taparse el sol.
      //
      // Los umbrales salen de medir la postura real sobre una captura y de
      // validarla con las 11.500 muestras de HaGRID.
      const muneca = mano[0]
      const centroX =
        (rostro[ROSTRO.sienDerecha].x + rostro[ROSTRO.sienIzquierda].x) / 2
      const medioAncho =
        Math.abs(rostro[ROSTRO.sienIzquierda].x - rostro[ROSTRO.sienDerecha].x) / 2 || 1

      // 1) Mano horizontal. Se mide cuánto pesa la componente vertical del eje
      // muñeca → nudillo medio. 0 = horizontal, 1 = vertical. Un saludo real
      // visto de frente da ~0.65 y una palma de pie ~0.95; 0.78 separa ambas.
      const ejeX = mano[9].x - muneca.x
      const ejeY = mano[9].y - muneca.y
      const largoEje = Math.hypot(ejeX, ejeY) || 1
      const horizontal = Math.abs(ejeY) / largoEje <= 0.78

      // 2) Las puntas, sobre el centro de la frente. Se acepta hasta 0.30 de la
      // altura de la cara: en una captura real quedaron a 0.06, así que hay
      // margen de sobra para la mano un poco alta o baja.
      const puntaX = (indice.x + medio.x) / 2
      const puntaY = (indice.y + medio.y) / 2
      const distPuntaFrente =
        Math.hypot(puntaX - rostro[ROSTRO.frente].x, puntaY - rostro[ROSTRO.frente].y) /
        escala
      const puntaEnLaFrente = distPuntaFrente <= 0.30

      // 3) La muñeca va hacia la oreja, no centrada delante de la cara.
      // 0 es el centro de la frente y 1 la sien. El rango va de 0.25 a 2.5:
      //   - el mínimo evita aceptar la mano centrada delante de la cara;
      //   - el máximo evita aceptar una mano que cruza toda la cara desde muy
      //     lejos. Sin ese tope, una mano con la muñeca al otro extremo del
      //     encuadre pasaba, porque sus puntas sí caían sobre la frente.
      const lateralMuneca = Math.abs(muneca.x - centroX) / medioAncho
      const haciaLaOreja = lateralMuneca >= 0.25 && lateralMuneca <= 2.5

      if (horizontal && puntaEnLaFrente && haciaLaOreja) {
        return { gesto: 'saludo', confianza: 0.82 + 0.16 * Math.min(1, lateralMuneca) }
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

  // Llamada: pulgar y meñique extendidos, el resto CLARAMENTE cerrado.
  //
  // Antes bastaba con que índice, medio y anillo quedaran por debajo del
  // umbral de extendido (150°). En una mano plana cualquiera de los tres baja
  // de 150 por ruido, así que al intentar el saludo militar salía una llamada
  // falsa. Ahora se exige la zona muerta de `dedosCerrados`, es decir que los
  // tres estén de verdad doblados.
  const cerrados = dedosCerrados(mano)
  if (ext.pulgar && ext.menique && cerrados.indice && cerrados.medio && cerrados.anillo) {
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
