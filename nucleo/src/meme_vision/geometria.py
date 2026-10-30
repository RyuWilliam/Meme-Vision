"""Geometría de manos: distancias, ángulos y features invariantes.

Los umbrales y el orden de los valores deben coincidir con `src/vision/mano.ts`.
"""

from __future__ import annotations

import math
from typing import Sequence

import numpy as np

Punto = Sequence[float]

INDICE_MUNECA = 0
INDICE_MEDIO_MCP = 9


def distancia3(a: Punto, b: Punto) -> float:
    return float(math.dist((a[0], a[1], a[2] if len(a) > 2 else 0.0),
                           (b[0], b[1], b[2] if len(b) > 2 else 0.0)))


def distancia2(a: Punto, b: Punto) -> float:
    return float(math.hypot(a[0] - b[0], a[1] - b[1]))


def angulo(a: Punto, b: Punto, c: Punto) -> float:
    """Ángulo en grados en el vértice b, entre b→a y b→c."""
    u = np.array([a[0] - b[0], a[1] - b[1], (a[2] if len(a) > 2 else 0.0) - (b[2] if len(b) > 2 else 0.0)])
    v = np.array([c[0] - b[0], c[1] - b[1], (c[2] if len(c) > 2 else 0.0) - (b[2] if len(b) > 2 else 0.0)])
    norma = float(np.linalg.norm(u) * np.linalg.norm(v))
    if norma < 1e-9:
        return 0.0
    coseno = float(np.clip(np.dot(u, v) / norma, -1.0, 1.0))
    return math.degrees(math.acos(coseno))


def _dedo_extendido(mano: np.ndarray, mcp: int, pip: int, tip: int) -> bool:
    return angulo(mano[mcp], mano[pip], mano[tip]) > 150


def extensiones(mano: np.ndarray) -> dict[str, bool]:
    """Qué dedos están extendidos, sin depender de la rotación de la mano."""
    pulgar_recto = angulo(mano[2], mano[3], mano[4]) > 150
    pulgar_lejos = distancia3(mano[4], mano[0]) > distancia3(mano[2], mano[0]) * 1.15
    escala = distancia3(mano[0], mano[9]) or 1.0
    pulgar_separado = distancia3(mano[4], mano[5]) > 0.8 * escala
    return {
        "pulgar": bool(pulgar_recto and pulgar_lejos and pulgar_separado),
        "indice": _dedo_extendido(mano, 5, 6, 8),
        "medio": _dedo_extendido(mano, 9, 10, 12),
        "anillo": _dedo_extendido(mano, 13, 14, 16),
        "menique": _dedo_extendido(mano, 17, 18, 20),
    }


def normalizar_mano(mano: np.ndarray, etiqueta: str | None) -> np.ndarray:
    """21 puntos → 63 valores centrados en la muñeca y escalados por la mano.

    La mano izquierda se refleja en X para que el modelo no dependa de la
    lateralidad. No se rota: la orientación distingue, por ejemplo, pulgar
    arriba de pulgar abajo.
    """
    muneca = mano[INDICE_MUNECA]
    escala = distancia3(muneca, mano[INDICE_MEDIO_MCP]) or 1.0
    relativa = mano[:, :3] - np.array([muneca[0], muneca[1], muneca[2] if mano.shape[1] > 2 else 0.0])
    relativa = relativa / escala
    if etiqueta == "Left":
        relativa[:, 0] *= -1
    return relativa.astype(np.float32).reshape(-1)


def distancia_a_segmento(punto: Punto, a: Punto, b: Punto) -> float:
    vx = b[0] - a[0]
    vy = b[1] - a[1]
    largo2 = vx * vx + vy * vy
    if largo2 < 1e-12:
        return distancia2(punto, a)
    t = ((punto[0] - a[0]) * vx + (punto[1] - a[1]) * vy) / largo2
    t = min(1.0, max(0.0, t))
    return float(math.hypot(punto[0] - (a[0] + t * vx), punto[1] - (a[1] + t * vy)))
