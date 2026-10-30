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
  const rostro = entrada.rostro

  if (rostro && rostro.length > ROSTRO.mandibulaDerecha && soloIndice) {
    const boca = {
      x: (rostro[ROSTRO.labioSuperior].x + rostro[ROSTRO.labioInferior].x) / 2,
      y: (rostro[ROSTRO.labioSuperior].y + rostro[ROSTRO.labioInferior].y) / 2,
      z: 0,
    }
    const escala =
      distancia2(rostro[ROSTRO.frente], rostro[ROSTRO.menton]) || 1
    const indice = mano[8]
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

  // Llamada: pulgar y meñique extendidos, el resto cerrado.
  if (ext.pulgar && ext.menique && !ext.indice && !ext.medio && !ext.anillo) {
    return { gesto: 'llamada', confianza: 0.9 }
  }

  // Like: primero el gesto integrado de MediaPipe (más robusto a la rotación).
  if (integrado?.nombre === 'Thumb_Up' && integrado.confianza > 0.5) {
    return { gesto: 'like', confianza: Math.max(0.7, integrado.confianza) }
  }

  if (ext.pulgar && !ext.indice && !ext.medio && !ext.anillo && !ext.menique) {
    const escala = distancia2(mano[0], mano[9]) || 1
    if (mano[4].y < mano[0].y - 0.15 * escala) {
      return { gesto: 'like', confianza: 0.78 }
    }
  }

  return SIN_GESTO
}
