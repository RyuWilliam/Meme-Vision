from __future__ import annotations

import math

import numpy as np

from meme_vision.caracteristicas_mano import extraer_caracteristicas_mano
from meme_vision.configuracion import TAMANO_ENTRADA_MANO


def _mano() -> list[list[float]]:
    mano = np.zeros((21, 3), dtype=np.float64)
    mano[0] = (0.50, 0.60, 0.0)
    mano[1], mano[2], mano[3], mano[4] = (
        (0.46, 0.56, 0.0),
        (0.42, 0.53, 0.0),
        (0.38, 0.50, 0.0),
        (0.34, 0.47, 0.0),
    )
    for base, x in ((5, 0.47), (9, 0.50), (13, 0.53), (17, 0.56)):
        mano[base] = (x, 0.45, 0.0)
        mano[base + 1] = (x, 0.40, 0.0)
        mano[base + 2] = (x, 0.38, 0.0)
        mano[base + 3] = (x, 0.36, 0.0)
    return mano.tolist()


def _muestra(mano: list[list[float]] | None, handedness: str = "Right") -> dict:
    return {"landmarks_mano": mano, "handedness": handedness}


def test_vector_de_69_y_flags() -> None:
    vector = extraer_caracteristicas_mano(_muestra(_mano()))
    assert vector.shape == (TAMANO_ENTRADA_MANO,)
    assert vector[63] == 1.0
    assert vector[64:69].sum() > 0.0


def test_sin_mano_es_todo_cero() -> None:
    vector = extraer_caracteristicas_mano(_muestra(None))
    assert vector.shape == (TAMANO_ENTRADA_MANO,)
    assert not vector.any()


def test_rotacion_no_cambia_las_caracteristicas() -> None:
    mano = np.asarray(_mano(), dtype=np.float64)
    angulo = math.radians(37)
    coseno, seno = math.cos(angulo), math.sin(angulo)
    relativa = mano - mano[0]
    rotada = relativa.copy()
    rotada[:, 0] = relativa[:, 0] * coseno - relativa[:, 1] * seno
    rotada[:, 1] = relativa[:, 0] * seno + relativa[:, 1] * coseno
    rotada += mano[0]

    a = extraer_caracteristicas_mano(_muestra(mano.tolist()))
    b = extraer_caracteristicas_mano(_muestra(rotada.tolist()))
    np.testing.assert_allclose(a, b, atol=1e-5)


def test_mano_izquierda_se_refleja() -> None:
    derecha = np.asarray(_mano(), dtype=np.float64)
    izquierda = derecha.copy()
    izquierda[:, 0] = 1.0 - izquierda[:, 0]

    a = extraer_caracteristicas_mano(_muestra(derecha.tolist(), "Right"))
    b = extraer_caracteristicas_mano(_muestra(izquierda.tolist(), "Left"))
    np.testing.assert_allclose(a, b, atol=1e-5)
