"""Vector de características compartido con la PWA.

Orden (127 valores):
  0..62    mano normalizada (21 × x,y,z)
  63..114  blendshapes faciales (52)
  115..122 geometría mano/cara (8)
  123..126 flags (mano, rostro, índice extendido, pulgar+meñique)

Cualquier cambio aquí debe replicarse en `src/vision/caracteristicas.ts`.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

import numpy as np

from .configuracion import CATEGORIAS_ROSTRO, MANO_PUNTOS, ROSTRO, TAMANO_ENTRADA
from .geometria import (
    angulo,
    distancia2,
    distancia_a_segmento,
    extensiones,
    normalizar_mano,
)


def _punto(p: Sequence[float]) -> np.ndarray:
    return np.array([p[0], p[1], p[2] if len(p) > 2 else 0.0], dtype=np.float64)


def media(a: Sequence[float], b: Sequence[float]) -> np.ndarray:
    return (_punto(a)[:2] + _punto(b)[:2]) / 2


def extraer_caracteristicas(
    muestra: Mapping[str, Any],
    categorias_rostro: Sequence[str] = CATEGORIAS_ROSTRO,
) -> np.ndarray:
    """Convierte una muestra cruda (landmarks + blendshapes) en el vector de 127."""
    if len(categorias_rostro) != len(CATEGORIAS_ROSTRO):
        raise ValueError(
            f"Se esperaban {len(CATEGORIAS_ROSTRO)} categorías de rostro y llegaron {len(categorias_rostro)}."
        )

    salida = np.zeros(TAMANO_ENTRADA, dtype=np.float32)
    mano_cruda = muestra.get("landmarks_mano")
    rostro_crudo = muestra.get("landmarks_rostro")
    mano = np.asarray(mano_cruda, dtype=np.float64) if mano_cruda else None
    rostro = np.asarray(rostro_crudo, dtype=np.float64) if rostro_crudo else None

    if mano is not None and mano.shape[0] >= MANO_PUNTOS:
        mano = mano[:MANO_PUNTOS, :3]
        salida[0:63] = normalizar_mano(mano, muestra.get("handedness"))

    blendshapes = muestra.get("blendshapes") or {}
    offset = 63
    for nombre in categorias_rostro:
        if isinstance(blendshapes, Mapping):
            valor = blendshapes.get(nombre, 0.0)
        else:
            valor = dict(blendshapes).get(nombre, 0.0)  # type: ignore[arg-type]
        salida[offset] = float(valor)
        offset += 1

    rostro_valido = rostro is not None and rostro.shape[0] > ROSTRO["mandibula_derecha"]
    salida[115:123] = _geometria(mano if mano is not None else None, rostro if rostro_valido else None)

    flags_indice = 0.0
    flags_pulgar_menique = 0.0
    if mano is not None:
        ext = extensiones(mano)
        flags_indice = 1.0 if ext["indice"] else 0.0
        flags_pulgar_menique = 1.0 if ext["pulgar"] and ext["menique"] else 0.0

    salida[123] = 1.0 if mano is not None else 0.0
    salida[124] = 1.0 if rostro_valido else 0.0
    salida[125] = flags_indice
    salida[126] = flags_pulgar_menique

    return np.nan_to_num(salida, nan=0.0, posinf=0.0, neginf=0.0)


def _geometria(mano: np.ndarray | None, rostro: np.ndarray | None) -> np.ndarray:
    """8 valores de interacción mano ↔ cara; -1 cuando falta algún dato."""
    salida = np.full(8, -1.0, dtype=np.float32)
    if rostro is None:
        return salida

    frente = rostro[ROSTRO["frente"]]
    menton = rostro[ROSTRO["menton"]]
    boca = media(rostro[ROSTRO["labio_superior"]], rostro[ROSTRO["labio_inferior"]])
    escala = distancia2(frente, menton) or 1.0

    salida[5] = distancia2(boca, menton) / escala
    if mano is None:
        return salida

    indice = mano[8]
    pulgar = mano[4]
    muneca = mano[0]

    a_mandibula = min(
        distancia_a_segmento(indice, rostro[ROSTRO["mandibula_izquierda"]], menton),
        distancia_a_segmento(indice, rostro[ROSTRO["mandibula_derecha"]], menton),
    )

    salida[0] = distancia2(indice, boca) / escala
    salida[1] = distancia2(indice, menton) / escala
    salida[2] = a_mandibula / escala
    salida[3] = distancia2(indice, muneca) / escala
    salida[4] = distancia2(pulgar, boca) / escala
    salida[6] = (indice[1] - boca[1]) / escala
    salida[7] = (indice[0] - boca[0]) / escala
    return salida


def angulo_dedo(mano: np.ndarray, a: int, b: int, c: int) -> float:
    """Expuesto para tests; equivale a `angulo` de geometria."""
    return angulo(mano[a], mano[b], mano[c])
