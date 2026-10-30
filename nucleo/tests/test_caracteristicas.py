from __future__ import annotations

import numpy as np

from meme_vision.caracteristicas import extraer_caracteristicas
from meme_vision.configuracion import TAMANO_ENTRADA
from meme_vision.geometria import extensiones


def mano_sintetica(indice_extendido: bool = True) -> np.ndarray:
    """Mano simple: índice arriba, resto cerrado, pulgar extendido a la izquierda."""
    mano = np.zeros((21, 3), dtype=np.float64)
    mano[0] = (0.50, 0.60, 0.0)  # muñeca
    mano[9] = (0.50, 0.50, 0.0)  # nudillo del medio (escala)
    # Pulgar
    mano[1] = (0.46, 0.56, 0.0)
    mano[2] = (0.42, 0.53, 0.0)
    mano[3] = (0.38, 0.50, 0.0)
    mano[4] = (0.34, 0.47, 0.0)
    # Índice
    mano[5] = (0.47, 0.45, 0.0)
    mano[6] = (0.47, 0.40, 0.0)
    mano[7] = (0.47, 0.35, 0.0)
    mano[8] = (0.47, 0.30, 0.0) if indice_extendido else (0.47, 0.44, 0.0)
    # Medio, anillo y meñique cerrados
    for base, x in ((9, 0.50), (13, 0.53), (17, 0.56)):
        mano[base] = (x, 0.45, 0.0)
        mano[base + 1] = (x, 0.40, 0.0)
        mano[base + 2] = (x, 0.42, 0.0)
        mano[base + 3] = (x, 0.44, 0.0)
    return mano


def rostro_sintetico() -> np.ndarray:
    rostro = np.zeros((478, 3), dtype=np.float64)
    rostro[10] = (0.50, 0.20, 0.0)   # frente
    rostro[13] = (0.50, 0.55, 0.0)   # labio superior
    rostro[14] = (0.50, 0.57, 0.0)   # labio inferior
    rostro[152] = (0.50, 0.80, 0.0)  # mentón
    rostro[172] = (0.35, 0.60, 0.0)  # mandíbula izquierda
    rostro[397] = (0.65, 0.60, 0.0)  # mandíbula derecha
    return rostro


def muestra(indice_extendido: bool = True, con_rostro: bool = True) -> dict:
    return {
        "landmarks_mano": mano_sintetica(indice_extendido).tolist(),
        "handedness": "Right",
        "landmarks_rostro": rostro_sintetico().tolist() if con_rostro else None,
        "blendshapes": {"mouthPressLeft": 0.5, "mouthPressRight": 0.4},
    }


def test_vector_tiene_el_tamano_esperado() -> None:
    vector = extraer_caracteristicas(muestra())
    assert vector.shape == (TAMANO_ENTRADA,)
    assert np.isfinite(vector).all()


def test_sin_mano_ni_rostro_los_flags_son_cero() -> None:
    vector = extraer_caracteristicas(
        {"landmarks_mano": None, "landmarks_rostro": None, "blendshapes": None}
    )
    assert vector[123] == 0
    assert vector[124] == 0
    assert np.all(vector[115:123] == -1)


def test_detecta_indice_extendido() -> None:
    ext = extensiones(mano_sintetica(True))
    assert ext["indice"] is True
    assert ext["medio"] is False


def test_flags_de_entrada() -> None:
    vector = extraer_caracteristicas(muestra())
    assert vector[123] == 1  # mano
    assert vector[124] == 1  # rostro
    assert vector[125] == 1  # índice extendido
    assert vector[126] == 0  # pulgar + meñique


def test_mano_izquierda_se_refleja_y_coincide() -> None:
    derecha = mano_sintetica()
    izquierda = derecha.copy()
    izquierda[:, 0] = 1.0 - izquierda[:, 0]

    a = extraer_caracteristicas(
        {"landmarks_mano": derecha.tolist(), "handedness": "Right", "landmarks_rostro": None}
    )
    b = extraer_caracteristicas(
        {"landmarks_mano": izquierda.tolist(), "handedness": "Left", "landmarks_rostro": None}
    )
    assert np.allclose(a[:63], b[:63], atol=1e-5)


def test_geometria_de_silencio_es_menor_que_la_de_mewing() -> None:
    # Índice pegado a la boca → distancia pequeña.
    silencio = muestra()
    silencio["landmarks_mano"][8] = [0.50, 0.56, 0.0]
    v_silencio = extraer_caracteristicas(silencio)

    # Índice en la mandíbula → distancia a la boca mayor.
    mewing = muestra()
    mewing["landmarks_mano"][8] = [0.42, 0.68, 0.0]
    v_mewing = extraer_caracteristicas(mewing)

    assert v_silencio[115] < v_mewing[115]
