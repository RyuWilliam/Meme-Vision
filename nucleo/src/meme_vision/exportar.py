"""Exporta el MLP de scikit-learn al JSON que consume la PWA."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

import numpy as np

from .configuracion import CATEGORIAS_ROSTRO, TAMANO_ENTRADA


def _json_serializable(valor: Any) -> Any:
    if isinstance(valor, dict):
        return {str(k): _json_serializable(v) for k, v in valor.items()}
    if isinstance(valor, (list, tuple)):
        return [_json_serializable(v) for v in valor]
    if isinstance(valor, (np.integer,)):
        return int(valor)
    if isinstance(valor, (np.floating,)):
        return float(valor)
    if isinstance(valor, (np.bool_,)):
        return bool(valor)
    if isinstance(valor, np.ndarray):
        return valor.tolist()
    return valor


def exportar_modelo(
    modelo: Any,
    escalador: Any,
    gestos: Sequence[str],
    umbral: float,
    metricas: dict[str, Any],
    ruta: Path,
    categorias_rostro: Sequence[str] = CATEGORIAS_ROSTRO,
) -> dict[str, Any]:
    capas = []
    for coeficientes, sesgos in zip(modelo.coefs_, modelo.intercepts_):
        # sklearn guarda [entradas][salidas]; la PWA espera [salidas][entradas].
        pesos = np.asarray(coeficientes, dtype=np.float64).T
        capas.append(
            {
                "pesos": pesos.tolist(),
                "sesgos": np.asarray(sesgos, dtype=np.float64).tolist(),
            }
        )

    desviacion = np.asarray(escalador.scale_, dtype=np.float64).copy()
    desviacion[np.abs(desviacion) < 1e-8] = 1.0

    payload = {
        "version": datetime.now(timezone.utc).strftime("%Y.%m.%d-%H%M"),
        "creado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "gestos": list(gestos),
        "tamano_entrada": TAMANO_ENTRADA,
        "categorias_rostro": list(categorias_rostro),
        "escalador": {
            "media": np.asarray(escalador.mean_, dtype=np.float64).tolist(),
            "desviacion": desviacion.tolist(),
        },
        "capas": capas,
        "umbral": float(umbral),
        "metricas": _json_serializable(metricas),
    }

    ruta.parent.mkdir(parents=True, exist_ok=True)
    with ruta.open("w", encoding="utf-8") as archivo:
        json.dump(payload, archivo, ensure_ascii=False, separators=(",", ":"))
    return payload


def guardar_metricas(metricas: dict[str, Any], ruta: Path) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    with ruta.open("w", encoding="utf-8") as archivo:
        json.dump(_json_serializable(metricas), archivo, ensure_ascii=False, indent=2)
