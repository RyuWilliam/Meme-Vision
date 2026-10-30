"""Carga, aumento y división del dataset de landmarks."""

from __future__ import annotations

import copy
import json
import random
from collections import Counter
from pathlib import Path
from typing import Any

import numpy as np
from sklearn.model_selection import GroupShuffleSplit, train_test_split

from .configuracion import GESTOS


def leer_jsonl(ruta: Path) -> list[dict[str, Any]]:
    muestras: list[dict[str, Any]] = []
    with ruta.open("r", encoding="utf-8") as archivo:
        for numero, linea in enumerate(archivo, start=1):
            linea = linea.strip()
            if not linea:
                continue
            try:
                muestras.append(json.loads(linea))
            except json.JSONDecodeError as error:
                print(f"[aviso] {ruta.name}:{numero} no es JSON válido ({error}); se omite.")
    return muestras


def cargar_datos(carpeta: Path) -> list[dict[str, Any]]:
    """Lee todos los .jsonl de la carpeta y descarta etiquetas desconocidas."""
    muestras: list[dict[str, Any]] = []
    for ruta in sorted(carpeta.glob("*.jsonl")):
        for muestra in leer_jsonl(ruta):
            etiqueta = muestra.get("etiqueta")
            if etiqueta not in GESTOS:
                print(f"[aviso] {ruta.name}: etiqueta desconocida {etiqueta!r}; se omite.")
                continue
            muestra.setdefault("sesion", ruta.stem)
            muestra.setdefault("persona", "anonima")
            muestras.append(muestra)
    return muestras


def resumen_datos(muestras: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "total": len(muestras),
        "por_etiqueta": dict(Counter(m["etiqueta"] for m in muestras)),
        "sesiones": sorted({m.get("sesion", "?") for m in muestras}),
        "personas": sorted({m.get("persona", "?") for m in muestras}),
    }


def aumentar(muestra: dict[str, Any], rng: random.Random) -> dict[str, Any]:
    """Variante sintética: espejo, rotación, escala, ruido y blendshapes."""
    variante = copy.deepcopy(muestra)
    mano = variante.get("landmarks_mano")
    if mano:
        puntos = np.asarray(mano, dtype=np.float64)[:, :3].copy()
        if rng.random() < 0.5:
            puntos[:, 0] = 1.0 - puntos[:, 0]
            variante["handedness"] = "Right" if variante.get("handedness") == "Left" else "Left"

        muneca = puntos[0].copy()
        relativo = puntos - muneca
        angulo_rad = np.deg2rad(rng.uniform(-8.0, 8.0))
        coseno, seno = np.cos(angulo_rad), np.sin(angulo_rad)
        x = relativo[:, 0] * coseno - relativo[:, 1] * seno
        y = relativo[:, 0] * seno + relativo[:, 1] * coseno
        escala = rng.uniform(0.9, 1.1)
        puntos[:, 0] = muneca[0] + x * escala
        puntos[:, 1] = muneca[1] + y * escala
        puntos[:, 2] = muneca[2] + relativo[:, 2] * escala
        puntos += np.random.default_rng(rng.randrange(2**32)).normal(0, 0.004, puntos.shape)
        variante["landmarks_mano"] = puntos.round(5).tolist()

    blendshapes = variante.get("blendshapes")
    if blendshapes:
        variante["blendshapes"] = {
            nombre: float(np.clip(valor + rng.gauss(0, 0.02), 0.0, 1.0))
            for nombre, valor in blendshapes.items()
        }
    return variante


def dividir_por_grupo(
    muestras: list[dict[str, Any]],
    semilla: int = 42,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    """Separa train/val/test por sesión (o persona) para medir generalización.

    Si hay una sola sesión, cae a un split estratificado y avisa: en ese caso
    las métricas estarán optimistas porque hay fuga de datos.
    """
    grupos = [str(m.get("sesion") or m.get("persona") or "unica") for m in muestras]
    grupos_unicos = sorted(set(grupos))

    if len(grupos_unicos) == 3:
        # Con tres sesiones, una para train, una para validación y una para test.
        import random

        barajados = grupos_unicos[:]
        random.Random(semilla).shuffle(barajados)
        grupo_test, grupo_val, grupo_train = barajados
        return (
            [m for m, g in zip(muestras, grupos) if g == grupo_train],
            [m for m, g in zip(muestras, grupos) if g == grupo_val],
            [m for m, g in zip(muestras, grupos) if g == grupo_test],
        )

    if len(grupos_unicos) > 3:
        indices = np.arange(len(muestras))
        gss = GroupShuffleSplit(n_splits=1, test_size=0.3, random_state=semilla)
        entrenamiento, temporal = next(gss.split(indices, groups=grupos))
        grupos_temporales = [grupos[i] for i in temporal]
        if len(set(grupos_temporales)) >= 2:
            gss2 = GroupShuffleSplit(n_splits=1, test_size=0.5, random_state=semilla + 1)
            val_rel, test_rel = next(
                gss2.split(np.arange(len(temporal)), groups=grupos_temporales)
            )
            validacion = [int(temporal[i]) for i in val_rel]
            prueba = [int(temporal[i]) for i in test_rel]
        else:
            validacion, prueba = [], [int(i) for i in temporal]
        return (
            [muestras[i] for i in entrenamiento],
            [muestras[i] for i in validacion],
            [muestras[i] for i in prueba],
        )

    if len(grupos_unicos) == 2:
        grupo_test = grupos_unicos[1]
        train = [m for m, g in zip(muestras, grupos) if g != grupo_test]
        test = [m for m, g in zip(muestras, grupos) if g == grupo_test]
        return train, [], test

    print("[aviso] Solo hay una sesión: se usa split aleatorio estratificado.")
    etiquetas = [m["etiqueta"] for m in muestras]
    train, temporal = train_test_split(
        muestras, test_size=0.3, random_state=semilla, stratify=etiquetas
    )
    try:
        validacion, prueba = train_test_split(
            temporal,
            test_size=0.5,
            random_state=semilla + 1,
            stratify=[m["etiqueta"] for m in temporal],
        )
    except ValueError:
        validacion, prueba = temporal[: len(temporal) // 2], temporal[len(temporal) // 2 :]
    return train, validacion, prueba
