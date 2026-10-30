from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from meme_vision.configuracion import GESTOS, TAMANO_ENTRADA
from meme_vision.entrenar import main


def _mano(indice: tuple[float, float], pulgar_arriba: bool = False) -> list[list[float]]:
    mano = np.zeros((21, 3), dtype=np.float64)
    mano[0] = (0.50, 0.60, 0.0)
    mano[9] = (0.50, 0.50, 0.0)
    mano[1], mano[2], mano[3], mano[4] = (
        (0.46, 0.56, 0.0),
        (0.42, 0.53, 0.0),
        (0.40, 0.50, 0.0),
        (0.38, 0.47, 0.0) if pulgar_arriba else (0.44, 0.52, 0.0),
    )
    mano[5], mano[6], mano[7], mano[8] = (
        (0.47, 0.45, 0.0),
        (0.47, 0.40, 0.0),
        (0.47, 0.35, 0.0),
        (indice[0], indice[1], 0.0),
    )
    for base, x in ((9, 0.50), (13, 0.53), (17, 0.56)):
        mano[base] = (x, 0.45, 0.0)
        mano[base + 1] = (x, 0.40, 0.0)
        mano[base + 2] = (x, 0.42, 0.0)
        mano[base + 3] = (x, 0.44, 0.0)
    return mano.tolist()


def _rostro() -> list[list[float]]:
    rostro = np.zeros((478, 3), dtype=np.float64)
    rostro[10] = (0.50, 0.20, 0.0)
    rostro[13] = (0.50, 0.55, 0.0)
    rostro[14] = (0.50, 0.57, 0.0)
    rostro[152] = (0.50, 0.80, 0.0)
    rostro[172] = (0.35, 0.60, 0.0)
    rostro[397] = (0.65, 0.60, 0.0)
    return rostro.tolist()


def _muestra(etiqueta: str, sesion: str, rng: np.random.Generator) -> dict:
    posiciones = {
        "like": (0.50, 0.30),
        "llamada": (0.30, 0.45),
        "silencio": (0.50, 0.56),
        "mewing": (0.50, 0.68),
        "ninguno": (0.70, 0.40),
    }
    x, y = posiciones[etiqueta]
    jitter = rng.normal(0, 0.01, 2)
    mano = None if etiqueta == "ninguno" else _mano((x + jitter[0], y + jitter[1]), etiqueta == "like")
    return {
        "version": 1,
        "sesion": sesion,
        "persona": "sintetica",
        "etiqueta": etiqueta,
        "handedness": "Right" if mano else None,
        "landmarks_mano": mano,
        "landmarks_rostro": _rostro(),
        "blendshapes": {"mouthPressLeft": 0.5, "mouthPressRight": 0.5},
    }


@pytest.mark.filterwarnings("ignore::UserWarning")
def test_entrenamiento_exporta_json_valido(tmp_path: Path) -> None:
    rng = np.random.default_rng(7)
    for sesion in ("s1", "s2", "s3"):
        with (tmp_path / f"{sesion}.jsonl").open("w", encoding="utf-8") as archivo:
            for etiqueta in GESTOS:
                for _ in range(12):
                    archivo.write(json.dumps(_muestra(etiqueta, sesion, rng)) + "\n")

    salida = tmp_path / "modelo.json"
    artefactos = tmp_path / "artefactos"
    codigo = main(
        [
            "--datos",
            str(tmp_path),
            "--salida",
            str(salida),
            "--modelos",
            str(artefactos),
            "--aumento",
            "1",
            "--semilla",
            "3",
        ]
    )
    assert codigo == 0
    assert salida.exists()

    modelo = json.loads(salida.read_text(encoding="utf-8"))
    assert modelo["tamano_entrada"] == TAMANO_ENTRADA
    assert len(modelo["gestos"]) == len(GESTOS)
    assert len(modelo["capas"]) == 3  # dos capas ocultas + salida
    assert len(modelo["capas"][0]["pesos"][0]) == TAMANO_ENTRADA
    assert 0.3 <= modelo["umbral"] <= 0.9
    assert "metricas" in modelo
    assert (artefactos / "mlp.joblib").exists()
