import { TAMANO_ENTRADA_MANO } from './tipos.ts'
import type { EntradaCuadro } from './tipos.ts'
import { extensiones, normalizarManoCanonica } from './mano.ts'

/**
 * Vector de 69 características para el modelo de mano, en el mismo orden que
 * `nucleo/src/meme_vision/caracteristicas_mano.py`:
 *   0..62   mano canónica (21 × x,y,z)
 *   63      mano presente
 *   64..68  pulgar, índice, medio, anillo, meñique extendidos
 */
export function extraerCaracteristicasMano(entrada: EntradaCuadro): Float32Array {
  const salida = new Float32Array(TAMANO_ENTRADA_MANO)
  const mano = entrada.mano && entrada.mano.length >= 21 ? entrada.mano : null
  if (!mano) return salida

  salida.set(normalizarManoCanonica(mano, entrada.manoEtiqueta), 0)

  const ext = extensiones(mano)
  salida[63] = 1
  salida[64] = ext.pulgar ? 1 : 0
  salida[65] = ext.indice ? 1 : 0
  salida[66] = ext.medio ? 1 : 0
  salida[67] = ext.anillo ? 1 : 0
  salida[68] = ext.menique ? 1 : 0
  return salida
}
