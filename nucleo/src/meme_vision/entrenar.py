"""Entrena el MLP de gestos y exporta `public/modelos/gestos_mlp.json`.

Uso:
    python -m meme_vision.entrenar
    python -m meme_vision.entrenar --aumento 4 --datos datos/crudo
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

from .caracteristicas import extraer_caracteristicas  # noqa: E402
from .configuracion import (  # noqa: E402
    GESTOS,
    RUTA_DATOS,
    RUTA_MODELO_WEB,
    RUTA_MODELOS,
)
from .dataset import aumentar, cargar_datos, dividir_por_grupo, resumen_datos  # noqa: E402
from .exportar import exportar_modelo, guardar_metricas  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")


def _caracteristicas(muestras: list[dict[str, Any]]) -> tuple[np.ndarray, np.ndarray]:
    X = np.stack([extraer_caracteristicas(m) for m in muestras])
    y = np.array([m["etiqueta"] for m in muestras])
    return X, y


def _pesos(y: np.ndarray) -> np.ndarray:
    conteo = Counter(y.tolist())
    pesos = np.array([1.0 / conteo[etiqueta] for etiqueta in y], dtype=np.float64)
    return pesos / pesos.mean()


def _entrenar(X: np.ndarray, y: np.ndarray, semilla: int) -> tuple[Any, StandardScaler]:
    escalador = StandardScaler().fit(X)
    X_escalado = escalador.transform(X)
    modelo = MLPClassifier(
        hidden_layer_sizes=(128, 64),
        activation="relu",
        solver="adam",
        alpha=1e-4,
        batch_size="auto",
        learning_rate_init=1e-3,
        max_iter=3000,
        early_stopping=True,
        validation_fraction=0.15,
        n_iter_no_change=40,
        random_state=semilla,
    )
    try:
        modelo.fit(X_escalado, y, sample_weight=_pesos(y))
    except TypeError:  # scikit-learn antiguo sin sample_weight en MLPClassifier.fit
        modelo.fit(X_escalado, y)
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
        f1 = f1_score(y, prediccion, labels=list(GESTOS), average="macro", zero_division=0)
        if f1 > mejor_f1:
            mejor_umbral, mejor_f1 = float(umbral), float(f1)
    return mejor_umbral, mejor_f1


def _matriz_confusion(y: np.ndarray, prediccion: np.ndarray, ruta: Path) -> list[list[int]]:
    etiquetas = list(GESTOS)
    matriz = confusion_matrix(y, prediccion, labels=etiquetas)
    figura, eje = plt.subplots(figsize=(7, 6))
    imagen = eje.imshow(matriz, cmap="Greens")
    eje.set_xticks(range(len(etiquetas)))
    eje.set_yticks(range(len(etiquetas)))
    eje.set_xticklabels(etiquetas, rotation=45, ha="right")
    eje.set_yticklabels(etiquetas)
    eje.set_xlabel("Predicción")
    eje.set_ylabel("Real")
    eje.set_title("Matriz de confusión — MemeVision")
    for i in range(matriz.shape[0]):
        for j in range(matriz.shape[1]):
            eje.text(j, i, str(matriz[i, j]), ha="center", va="center", fontsize=10)
    figura.colorbar(imagen, ax=eje)
    figura.tight_layout()
    ruta.parent.mkdir(parents=True, exist_ok=True)
    figura.savefig(ruta, dpi=140)
    plt.close(figura)
    return matriz.tolist()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Entrena el clasificador de gestos de MemeVision.")
    parser.add_argument("--datos", type=Path, default=RUTA_DATOS, help="Carpeta con los .jsonl")
    parser.add_argument("--salida", type=Path, default=RUTA_MODELO_WEB, help="JSON para la PWA")
    parser.add_argument("--aumento", type=int, default=3, help="Variantes sintéticas por muestra")
    parser.add_argument("--modelos", type=Path, default=RUTA_MODELOS, help="Carpeta de artefactos")
    parser.add_argument("--semilla", type=int, default=42)
    args = parser.parse_args(argv)

    muestras = cargar_datos(args.datos)
    if not muestras:
        print(
            "No hay datos en "
            f"{args.datos}.\n\n"
            "1. Ejecuta el recolector:  python -m meme_vision.recolectar --persona tu_nombre\n"
            "2. Graba cada gesto con las teclas 1-4 (y 0 para reposo).\n"
            "3. Vuelve a ejecutar este comando.",
            file=sys.stderr,
        )
        return 1

    resumen = resumen_datos(muestras)
    print("Dataset:", resumen)
    print("Nota: el split es por sesión para medir generalización real.")

    entrenamiento, validacion, prueba = dividir_por_grupo(muestras, args.semilla)
    if not prueba:
        print("Se necesitan al menos dos sesiones para evaluar.", file=sys.stderr)
        return 1

    # Si no hay validación aparte, se reserva una parte del entrenamiento.
    if not validacion:
        etiquetas = [m["etiqueta"] for m in entrenamiento]
        try:
            entrenamiento, validacion = train_test_split(
                entrenamiento,
                test_size=0.2,
                random_state=args.semilla + 7,
                stratify=etiquetas,
            )
        except ValueError:
            corte = int(len(entrenamiento) * 0.8)
            entrenamiento, validacion = entrenamiento[:corte], entrenamiento[corte:]

    if not entrenamiento or not validacion or not prueba:
        print("No hay suficientes muestras para train/val/test. Graba más datos.", file=sys.stderr)
        return 1

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
    faltantes = [g for g in GESTOS if g not in set(y_train.tolist())]
    if faltantes:
        print(f"[aviso] No hay muestras de entrenamiento para: {', '.join(faltantes)}")

    modelo, escalador = _entrenar(X_train, y_train, args.semilla)
    umbral, f1_val = _elegir_umbral(modelo, escalador, X_val, y_val)
    print(f"Umbral elegido en validación: {umbral:.2f} (macro F1={f1_val:.3f})")

    # Reentrenar con train + val para la entrega final.
    X_final = np.vstack([X_train, X_val])
    y_final = np.concatenate([y_train, y_val])
    modelo, escalador = _entrenar(X_final, y_final, args.semilla)

    prediccion = _predecir(modelo, escalador, X_test, umbral)
    exactitud = float(accuracy_score(y_test, prediccion))
    macro_f1 = float(f1_score(y_test, prediccion, labels=list(GESTOS), average="macro", zero_division=0))
    ponderado = float(
        f1_score(y_test, prediccion, labels=list(GESTOS), average="weighted", zero_division=0)
    )
    reporte = classification_report(
        y_test,
        prediccion,
        labels=list(GESTOS),
        output_dict=True,
        zero_division=0,
    )
    matriz = _matriz_confusion(y_test, prediccion, args.modelos / "matriz_confusion.png")

    metricas = {
        "exactitud": exactitud,
        "macro_f1": macro_f1,
        "f1_ponderado": ponderado,
        "umbral": umbral,
        "f1_validacion": f1_val,
        "por_clase": reporte,
        "matriz_confusion": matriz,
        "etiquetas": list(GESTOS),
        "dataset": resumen,
        "muestras": {
            "entrenamiento": int(len(X_train)),
            "validacion": int(len(X_val)),
            "prueba": int(len(X_test)),
        },
    }

    print(f"\nTest: accuracy={exactitud:.3f}  macro F1={macro_f1:.3f}  weighted F1={ponderado:.3f}\n")
    print(classification_report(y_test, prediccion, labels=list(GESTOS), zero_division=0))

    args.modelos.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {"modelo": modelo, "escalador": escalador, "gestos": list(modelo.classes_)},
        args.modelos / "mlp.joblib",
    )
    guardar_metricas(metricas, args.modelos / "metricas.json")
    exportar_modelo(
        modelo,
        escalador,
        list(modelo.classes_),
        umbral,
        metricas,
        args.salida,
    )
    print(f"Modelo exportado a {args.salida}")
    print(f"Métricas y matriz en {args.modelos}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
