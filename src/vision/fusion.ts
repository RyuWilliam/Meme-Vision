import type { PrediccionMlp } from './mlp.ts'
import type { ResultadoReglas } from './reglas.ts'
import type { DeteccionGesto, GestoIntegrado } from './tipos.ts'

export interface EntradasFusion {
  reglas: ResultadoReglas
  mlpMano: PrediccionMlp | null
  mlpRostro: PrediccionMlp | null
  umbralMano: number
  umbralRostro: number
  mano: boolean
  rostro: boolean
  integrado: GestoIntegrado | null
}

/**
 * Combina reglas y modelos con una prioridad explícita:
 *
 *   1. Reglas de rostro (`silencio`, `mewing`, `saludo`): el MLP de mano no ve
 *      la cara.
 *   2. `dislike` y `like`: dependen de la orientación; las reglas de MediaPipe
 *      son más fiables que un MLP entrenado con landmarks canonicalizados.
 *   3. `llamada`: la regla es muy específica (pulgar + meñique).
 *   4. MLP de mano: gestos nuevos que no dependen del rostro.
 *   5. MLP de rostro (127 features), si existe un modelo entrenado.
 *   6. `ninguno`.
 *
 * Si un MLP no supera su umbral, NO se usa su predicción: se cae a la regla o
 * a `ninguno`. Ese era el bug del motor anterior, que aceptaba predicciones
 * débiles cuando las reglas no encontraban nada.
 */
export function combinarDeteccion(entradas: EntradasFusion): DeteccionGesto {
  const base = {
    mano: entradas.mano,
    rostro: entradas.rostro,
    integrado: entradas.integrado,
  }
  const { reglas } = entradas

  if (
    (reglas.gesto === 'silencio' || reglas.gesto === 'mewing' || reglas.gesto === 'saludo') &&
    reglas.confianza >= 0.5
  ) {
    return { ...base, gesto: reglas.gesto, confianza: reglas.confianza, origen: 'reglas' }
  }

  if (reglas.gesto === 'dislike' || reglas.gesto === 'like' || reglas.gesto === 'llamada') {
    return { ...base, gesto: reglas.gesto, confianza: reglas.confianza, origen: 'reglas' }
  }

  const mano = entradas.mlpMano
  if (
    entradas.mano &&
    mano &&
    mano.gesto !== 'ninguno' &&
    mano.confianza >= entradas.umbralMano
  ) {
    return {
      ...base,
      gesto: mano.gesto,
      confianza: mano.confianza,
      origen: 'mlp-mano',
    }
  }

  const rostro = entradas.mlpRostro
  if (rostro && rostro.gesto !== 'ninguno' && rostro.confianza >= entradas.umbralRostro) {
    return {
      ...base,
      gesto: rostro.gesto,
      confianza: rostro.confianza,
      origen: 'mlp',
    }
  }

  return { ...base, gesto: 'ninguno', confianza: 0, origen: 'reglas' }
}
