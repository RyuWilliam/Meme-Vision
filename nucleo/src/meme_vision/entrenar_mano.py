"""Entrena el MLP de mano y exporta `public/modelos/gestos_mano_mlp.json`.

El modelo usa 69 características (21 landmarks canónicos + flags de mano y
dedos) y no necesita rostro. Los gestos que dependen de la cara siguen en el
motor de reglas.

Uso:
    python -m meme_vision.entrenar_mano
    python -m meme_vision.entrenar_mano --aumento 0 --datos datos/crudo
"""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path
from typing import Any

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from sklearn.metrics import (  # noqa: E402
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import train_test_split  # noqa: E402
from sklearn.neural_network import MLPClassifier  # noqa: E402
from sklearn.preprocessing import StandardScaler  # noqa: E402

from .caracteristicas_mano import extraer_caracteristicas_mano  # noqa: E402
from .configuracion import (  # noqa: E402
    GESTOS_MANO,
    RUTA_DATOS,
    RUTA_MODELO_MANO_WEB,
    RUTA_MODELOS,
    TAMANO_ENTRADA_MANO,
)
from .dataset import aumentar, leer_jsonl  # noqa: E402
from .exportar import exportar_modelo, guardar_metricas  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")


def cargar_mano(carpeta: Path) -> list[dict[str, Any]]:
    muestras: list[dict[str, Any]] = []
    for ruta in sorted(carpeta.glob("*.jsonl")):
        for muestra in leer_jsonl(ruta):
            etiqueta = muestra.get("etiqueta")
            if etiqueta not in GESTOS_MANO:
                continue
            muestra.setdefault("sesion", ruta.stem)
            muestra.setdefault("persona", "anonima")
            muestras.append(muestra)
    return muestras


def _caracteristicas(muestras: list[dict[str, Any]]) -> tuple[np.ndarray, np.ndarray]:
    X = np.stack([extraer_caracteristicas_mano(m) for m in muestras])
    y = np.array([m["etiqueta"] for m in muestras])
    return X, y


def _pesos(y: np.ndarray) -> np.ndarray:
    conteo = Counter(y.tolist())
    pesos = np.array([1.0 / conteo[etiqueta] for etiqueta in y], dtype=np.float64)
    return pesos / pesos.mean()


def _entrenar(X: np.ndarray, y: np.ndarray, semilla: int) -> tuple[Any, StandardScaler]:
    escalador = StandardScaler().fit(X)
    modelo = MLPClassifier(
        hidden_layer_sizes=(128, 64),
        activation="relu",
        solver="adam",
        alpha=1e-4,
        learning_rate_init=1e-3,
        max_iter=1500,
        early_stopping=True,
        validation_fraction=0.15,
        n_iter_no_change=25,
        random_state=semilla,
    )
    try:
        modelo.fit(escalador.transform(X), y, sample_weight=_pesos(y))
    except TypeError:  # scikit-learn antiguo sin sample_weight
        modelo.fit(escalador.transform(X), y)
    return modelo, escalador


def _predecir(
    modelo: Any,
    escalador: StandardScaler,
    X: np.ndarray,
    umbral: float,
) -> np.ndarray:
    probabilidades = modelo.predict_proba(escalador.transform(X))
    indices = probabilidades.argmax(axis=1)
    clases = np.asarray(modelo.classes_)
    maximos = probabilidades.max(axis=1)
    return np.where(maximos >= umbral, clases[indices], "ninguno")


def _elegir_umbral(
    modelo: Any,
    escalador: StandardScaler,
    X: np.ndarray,
    y: np.ndarray,
) -> tuple[float, float]:
    mejor_umbral, mejor_f1 = 0.5, -1.0
    for umbral in np.arange(0.30, 0.91, 0.02):
        prediccion = _predecir(modelo, escalador, X, float(umbral))
        f1 = f1_score(y, prediccion, labels=list(GESTOS_MANO), average="macro", zero_division=0)
        if f1 > mejor_f1:
            mejor_umbral, mejor_f1 = float(umbral), float(f1)
    return mejor_umbral, mejor_f1


def _matriz_confusion(y: np.ndarray, prediccion: np.ndarray, ruta: Path) -> list[list[int]]:
    etiquetas = list(GESTOS_MANO)
    matriz = confusion_matrix(y, prediccion, labels=etiquetas)
    figura, eje = plt.subplots(figsize=(8, 7))
    imagen = eje.imshow(matriz, cmap="Greens")
    eje.set_xticks(range(len(etiquetas)))
    eje.set_yticks(range(len(etiquetas)))
    eje.set_xticklabels(etiquetas, rotation=45, ha="right")
    eje.set_yticklabels(etiquetas)
    eje.set_xlabel("Predicción")
    eje.set_ylabel("Real")
    eje.set_title("Matriz de confusión — modelo de mano")
    for i in range(matriz.shape[0]):
        for j in range(matriz.shape[1]):
            eje.text(j, i, str(matriz[i, j]), ha="center", va="center", fontsize=9)
    figura.colorbar(imagen, ax=eje)
    figura.tight_layout()
    ruta.parent.mkdir(parents=True, exist_ok=True)
    figura.savefig(ruta, dpi=140)
    plt.close(figura)
    return matriz.tolist()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Entrena el clasificador de mano de gestIA.")
    parser.add_argument("--datos", type=Path, default=RUTA_DATOS, help="Carpeta con los .jsonl")
    parser.add_argument("--salida", type=Path, default=RUTA_MODELO_MANO_WEB)
    parser.add_argument("--aumento", type=int, default=1, help="Variantes sintéticas por muestra")
    parser.add_argument("--modelos", type=Path, default=RUTA_MODELOS)
    parser.add_argument("--semilla", type=int, default=42)
    args = parser.parse_args(argv)

    muestras = cargar_mano(args.datos)
    if not muestras:
        print(
            f"No hay datos de mano en {args.datos}.\n"
            "Ejecuta primero: python -m meme_vision.importar_landmarks",
            file=sys.stderr,
        )
        return 1

    resumen = {
        "total": len(muestras),
        "por_etiqueta": dict(Counter(m["etiqueta"] for m in muestras)),
    }
    print("Dataset:", resumen)

    etiquetas = [m["etiqueta"] for m in muestras]
    try:
        entrenamiento, temporal = train_test_split(
            muestras,
            test_size=0.3,
            random_state=args.semilla,
            stratify=etiquetas,
        )
        validacion, prueba = train_test_split(
            temporal,
            test_size=0.5,
            random_state=args.semilla + 1,
            stratify=[m["etiqueta"] for m in temporal],
        )
    except ValueError:
        corte = int(len(muestras) * 0.7)
        entrenamiento, temporal = muestras[:corte], muestras[corte:]
        validacion, prueba = temporal[: len(temporal) // 2], temporal[len(temporal) // 2 :]

    if not entrenamiento or not validacion or not prueba:
        print("No hay suficientes muestras para train/val/test.", file=sys.stderr)
        return 1

    print("Extrayendo características…", flush=True)
    X_train, y_train = _caracteristicas(entrenamiento)
    X_val, y_val = _caracteristicas(validacion)
    X_test, y_test = _caracteristicas(prueba)

    if args.aumento > 0:
        import random

        rng = random.Random(args.semilla)
        X_aumentado = [X_train]
        y_aumentado = [y_train]
        for _ in range(args.aumento):
            variantes = [aumentar(m, rng) for m in entrenamiento]
            Xv, yv = _caracteristicas(variantes)
            X_aumentado.append(Xv)
            y_aumentado.append(yv)
        X_train = np.vstack(X_aumentado)
        y_train = np.concatenate(y_aumentado)
        print(f"Aumento: {len(entrenamiento)} -> {len(X_train)} muestras de entrenamiento.")

    print(
        "Muestras:",
        f"train={len(X_train)}",
        f"val={len(X_val)}",
        f"test={len(X_test)}",
    )
    faltantes = [g for g in GESTOS_MANO if g not in set(y_train.tolist())]
    if faltantes:
        print(f"[aviso] No hay muestras de entrenamiento para: {', '.join(faltantes)}")

    print("Entrenando MLP (modelo para elegir el umbral)…", flush=True)
    modelo, escalador = _entrenar(X_train, y_train, args.semilla)
    umbral, f1_val = _elegir_umbral(modelo, escalador, X_val, y_val)
    print(f"Umbral elegido en validación: {umbral:.2f} (macro F1={f1_val:.3f})", flush=True)

    X_final = np.vstack([X_train, X_val])
    y_final = np.concatenate([y_train, y_val])
    print("Reentrenando con train + val…", flush=True)
    modelo, escalador = _entrenar(X_final, y_final, args.semilla)

    prediccion = _predecir(modelo, escalador, X_test, umbral)
    exactitud = float(accuracy_score(y_test, prediccion))
    macro_f1 = float(
        f1_score(y_test, prediccion, labels=list(GESTOS_MANO), average="macro", zero_division=0)
    )
    ponderado = float(
        f1_score(y_test, prediccion, labels=list(GESTOS_MANO), average="weighted", zero_division=0)
    )
    reporte = classification_report(
        y_test,
        prediccion,
        labels=list(GESTOS_MANO),
        output_dict=True,
        zero_division=0,
    )
    matriz = _matriz_confusion(y_test, prediccion, args.modelos / "matriz_confusion_mano.png")

    metricas = {
        "exactitud": exactitud,
        "macro_f1": macro_f1,
        "f1_ponderado": ponderado,
        "umbral": umbral,
        "f1_validacion": f1_val,
        "por_clase": reporte,
        "matriz_confusion": matriz,
        "etiquetas": list(GESTOS_MANO),
        "dataset": resumen,
        "muestras": {
            "entrenamiento": int(len(X_train)),
            "validacion": int(len(X_val)),
            "prueba": int(len(X_test)),
        },
        "nota": (
            "Entrenado con landmarks públicos de HaGRID; el split es aleatorio "
            "por frame, así que las métricas son optimistas. La clase ninguno "
            "incluye negativos sintéticos."
        ),
    }

    print(f"\nTest: accuracy={exactitud:.3f}  macro F1={macro_f1:.3f}  weighted F1={ponderado:.3f}\n")
    print(classification_report(y_test, prediccion, labels=list(GESTOS_MANO), zero_division=0))

    args.modelos.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {"modelo": modelo, "escalador": escalador, "gestos": list(modelo.classes_)},
        args.modelos / "mlp_mano.joblib",
    )
    guardar_metricas(metricas, args.modelos / "metricas_mano.json")
    exportar_modelo(
        modelo,
        escalador,
        list(modelo.classes_),
        umbral,
        metricas,
        args.salida,
        categorias_rostro=[],
        tamano_entrada=TAMANO_ENTRADA_MANO,
    )
    print(f"Modelo exportado a {args.salida}")
    print(f"Métricas y matriz en {args.modelos}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
