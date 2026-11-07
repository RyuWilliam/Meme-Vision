from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from meme_vision.configuracion import GESTOS_MANO, TAMANO_ENTRADA_MANO
from meme_vision.entrenar_mano import main


def _mano() -> list[list[float]]:
    mano = np.zeros((21, 3), dtype=np.float64)
    mano[0] = (0.50, 0.60, 0.0)
    for i, (x, y) in enumerate(
        [
            (0.46, 0.56), (0.42, 0.53), (0.38, 0.50), (0.34, 0.47),
            (0.47, 0.45), (0.47, 0.40), (0.47, 0.38), (0.47, 0.36),
            (0.50, 0.45), (0.50, 0.40), (0.50, 0.38), (0.50, 0.36),
            (0.53, 0.45), (0.53, 0.40), (0.53, 0.38), (0.53, 0.36),
            (0.56, 0.45), (0.56, 0.40), (0.56, 0.38), (0.56, 0.36),
        ],
        start=1,
    ):
        mano[i] = (x, y, 0.0)
    return mano.tolist()


@pytest.mark.filterwarnings("ignore::UserWarning")
def test_entrenamiento_mano_exporta_json_valido(tmp_path: Path) -> None:
    with (tmp_path / "sintetico.jsonl").open("w", encoding="utf-8") as archivo:
        for etiqueta in GESTOS_MANO:
            for i in range(14):
                archivo.write(
                    json.dumps(
                        {
                            "version": 1,
                            "sesion": f"s-{etiqueta}",
                            "persona": "sintetica",
                            "etiqueta": etiqueta,
                            "handedness": "Right",
                            "landmarks_mano": _mano(),
                            "landmarks_rostro": None,
                            "blendshapes": None,
                        }
                    )
                    + "\n"
                )

    salida = tmp_path / "modelo_mano.json"
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
            "0",
            "--semilla",
            "3",
        ]
    )
    assert codigo == 0
    assert salida.exists()

    modelo = json.loads(salida.read_text(encoding="utf-8"))
    assert modelo["tamano_entrada"] == TAMANO_ENTRADA_MANO
    assert modelo["categorias_rostro"] == []
    assert len(modelo["capas"]) == 3
    assert len(modelo["capas"][0]["pesos"][0]) == TAMANO_ENTRADA_MANO
    assert (artefactos / "mlp_mano.joblib").exists()
