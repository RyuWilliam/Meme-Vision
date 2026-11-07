"""Vector de 69 características para el modelo de mano.

Orden (igual que `src/vision/caracteristicas-mano.ts`):
  0..62   mano canónica (21 × x,y,z)
  63      mano presente
  64..68  pulgar, índice, medio, anillo, meñique extendidos

No usa el rostro: los gestos que dependen de la cara (`silencio`, `mewing`)
siguen resolviéndose con el motor de reglas.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

import numpy as np

from .configuracion import MANO_PUNTOS, TAMANO_ENTRADA_MANO
from .geometria import extensiones, normalizar_mano_canonica


def extraer_caracteristicas_mano(muestra: Mapping[str, Any]) -> np.ndarray:
    """Convierte una muestra cruda de mano en el vector de 69."""
    salida = np.zeros(TAMANO_ENTRADA_MANO, dtype=np.float32)
    mano_cruda = muestra.get("landmarks_mano")
    if not mano_cruda:
        return salida

    mano = np.asarray(mano_cruda, dtype=np.float64)
    if mano.ndim != 2 or mano.shape[0] < MANO_PUNTOS or mano.shape[1] < 2:
        return salida
    if mano.shape[1] == 2:
        mano = np.hstack([mano, np.zeros((mano.shape[0], 1))])
    mano = mano[:MANO_PUNTOS, :3]

    salida[0:63] = normalizar_mano_canonica(mano, muestra.get("handedness")).reshape(-1)

    ext = extensiones(mano)
    salida[63] = 1.0
    salida[64] = 1.0 if ext["pulgar"] else 0.0
    salida[65] = 1.0 if ext["indice"] else 0.0
    salida[66] = 1.0 if ext["medio"] else 0.0
    salida[67] = 1.0 if ext["anillo"] else 0.0
    salida[68] = 1.0 if ext["menique"] else 0.0

    return np.nan_to_num(salida, nan=0.0, posinf=0.0, neginf=0.0)


def caracteristicas_lote(muestras: Sequence[Mapping[str, Any]]) -> np.ndarray:
    return np.stack([extraer_caracteristicas_mano(m) for m in muestras])
