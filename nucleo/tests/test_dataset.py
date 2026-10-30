from __future__ import annotations

import random

from meme_vision.dataset import aumentar, dividir_por_grupo


def muestra(etiqueta: str, sesion: str) -> dict:
    return {
        "etiqueta": etiqueta,
        "sesion": sesion,
        "persona": "tester",
        "landmarks_mano": [[0.5, 0.5, 0.0] for _ in range(21)],
        "handedness": "Right",
        "blendshapes": {"mouthPressLeft": 0.5},
    }


def test_aumentar_conserva_etiqueta_y_estructura() -> None:
    original = muestra("like", "s1")
    variante = aumentar(original, random.Random(1))
    assert variante["etiqueta"] == "like"
    assert len(variante["landmarks_mano"]) == 21
    assert variante["handedness"] in {"Left", "Right"}
    assert original["landmarks_mano"] == [[0.5, 0.5, 0.0] for _ in range(21)]


def test_split_por_sesion_no_mezcla_grupos() -> None:
    muestras = [muestra("like", f"s{i}") for i in range(30) for _ in range(3)]
    train, val, test = dividir_por_grupo(muestras, semilla=3)
    grupos = [set(m["sesion"] for m in parte) for parte in (train, val, test)]
    assert grupos[0].isdisjoint(grupos[2])
    assert grupos[1].isdisjoint(grupos[2])
    assert len(train) > 0 and len(test) > 0
