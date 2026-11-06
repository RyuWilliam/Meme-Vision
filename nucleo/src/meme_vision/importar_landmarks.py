"""Importa landmarks públicos de HaGRID al formato que entrena MemeVision.

Fuente: `HandLandmarks.csv` de Shadowfax221/HandGesture2Emoji, generado con
MediaPipe sobre HaGRID (12 clases, 1.000 muestras por clase). El CSV no tiene
cabecera y cada fila es:

    etiqueta, handedness, x0,y0,z0, ..., x20,y20,z20

Solo se usan las clases que el modelo de mano sabe distinguir sin rostro.
Como el CSV no trae la clase negativa, se generan muestras `ninguno`
sintéticas mezclando pares de gestos y añadiendo manos ausentes. Para una
entrega real conviene sustituirlas por grabaciones propias de `0` (reposo).

Uso:
    python -m meme_vision.importar_landmarks
    python -m meme_vision.importar_landmarks --forzar --ninguno 3000
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter
from pathlib import Path
from urllib.request import urlretrieve

import numpy as np

from .configuracion import RUTA_DATOS, RUTA_DATOS_PUBLICOS

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

URL_CSV = (
    "https://raw.githubusercontent.com/Shadowfax221/HandGesture2Emoji/"
    "main/datasets/HandLandmarks.csv"
)
NOMBRE_CSV = "HandLandmarks.csv"

# Índice del CSV → etiqueta de la app. Se excluyen:
#   1 dislike, 3 like  -> dependen de la orientación y los resuelven las reglas
#   4 mute             -> se confunde con `one` sin el rostro
#   11 stop_inverted   -> se confunde con `stop`
MAPA_ETIQUETAS = {
    0: "llamada",
    2: "fist",
    5: "ok",
    6: "one",
    7: "palm",
    8: "peace",
    9: "rock",
    10: "stop",
}


def descargar(destino: Path, forzar: bool = False) -> Path:
    destino.parent.mkdir(parents=True, exist_ok=True)
    if destino.exists() and destino.stat().st_size > 1_000_000 and not forzar:
        print(f"[ok] {destino.name} ya existe ({destino.stat().st_size / 1e6:.1f} MB)")
        return destino
    print(f"[...] Descargando {URL_CSV}")
    urlretrieve(URL_CSV, destino)
    print(f"[ok] {destino} ({destino.stat().st_size / 1e6:.1f} MB)")
    return destino


def leer_csv(ruta: Path) -> list[tuple[int, str, list[list[float]]]]:
    filas: list[tuple[int, str, list[list[float]]]] = []
    with ruta.open("r", encoding="utf-8", newline="") as archivo:
        for numero, fila in enumerate(csv.reader(archivo), start=1):
            if len(fila) != 65:
                print(f"[aviso] línea {numero}: {len(fila)} columnas; se omite.")
                continue
            try:
                etiqueta = int(fila[0])
                handedness = "Left" if int(float(fila[1])) == 1 else "Right"
                valores = [float(v) for v in fila[2:]]
            except ValueError:
                print(f"[aviso] línea {numero}: valores inválidos; se omite.")
                continue
            puntos = [valores[i : i + 3] for i in range(0, 63, 3)]
            filas.append((etiqueta, handedness, puntos))
    return filas


def _muestra(
    etiqueta: str,
    handedness: str | None,
    puntos: list[list[float]] | None,
    sesion: str,
    persona: str,
    origen: str,
) -> dict:
    return {
        "version": 1,
        "sesion": sesion,
        "persona": persona,
        "etiqueta": etiqueta,
        "handedness": handedness,
        "landmarks_mano": puntos,
        "landmarks_rostro": None,
        "blendshapes": None,
        "origen": origen,
    }


def generar_ninguno(
    gestos: list[tuple[str, str, list[list[float]]]],
    cantidad: int,
    semilla: int,
) -> list[dict]:
    """Crea negativos sintéticos: manos ausentes y mezclas de dos gestos.

    Las mezclas son "negativos duros": poses ambiguas que el modelo debe
    rechazar en vez de forzar un gesto.
    """
    rng = np.random.default_rng(semilla)
    por_mano: dict[str, list[tuple[str, str, list[list[float]]]]] = {
        "Left": [],
        "Right": [],
    }
    for gesto in gestos:
        por_mano[gesto[1]].append(gesto)

    salida: list[dict] = []
    for i in range(cantidad):
        if i % 5 == 0:
            salida.append(
                _muestra("ninguno", None, None, "hagrid-ninguno", "sintetico", "sintetico")
            )
            continue

        handedness = "Left" if rng.random() < 0.5 else "Right"
        candidatos = por_mano[handedness]
        a = candidatos[int(rng.integers(0, len(candidatos)))]
        b = candidatos[int(rng.integers(0, len(candidatos)))]
        t = float(rng.uniform(0.3, 0.7))
        puntos = np.asarray(a[2], dtype=np.float64) * (1 - t) + np.asarray(
            b[2], dtype=np.float64
        ) * t
        puntos += rng.normal(0, 0.01, puntos.shape)
        salida.append(
            _muestra(
                "ninguno",
                handedness,
                puntos.round(5).tolist(),
                "hagrid-ninguno",
                "sintetico",
                "sintetico",
            )
        )
    return salida


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Importa landmarks públicos de HaGRID.")
    parser.add_argument("--csv", type=Path, default=RUTA_DATOS_PUBLICOS / NOMBRE_CSV)
    parser.add_argument("--salida", type=Path, default=RUTA_DATOS / "hagrid_mano.jsonl")
    parser.add_argument("--ninguno", type=int, default=2500, help="Negativos sintéticos")
    parser.add_argument("--semilla", type=int, default=42)
    parser.add_argument("--forzar", action="store_true", help="Vuelve a descargar el CSV")
    args = parser.parse_args(argv)

    ruta_csv = descargar(args.csv, args.forzar)
    filas = leer_csv(ruta_csv)

    gestos: list[tuple[str, str, list[list[float]]]] = []
    for etiqueta_csv, handedness, puntos in filas:
        etiqueta = MAPA_ETIQUETAS.get(etiqueta_csv)
        if etiqueta is None:
            continue
        gestos.append((etiqueta, handedness, puntos))

    if not gestos:
        print("El CSV no tenía filas utilizables.", file=sys.stderr)
        return 1

    muestras = [
        _muestra(etiqueta, handedness, puntos, f"hagrid-{etiqueta}", "hagrid", "hagrid")
        for etiqueta, handedness, puntos in gestos
    ]
    muestras += generar_ninguno(gestos, args.ninguno, args.semilla)

    args.salida.parent.mkdir(parents=True, exist_ok=True)
    with args.salida.open("w", encoding="utf-8") as archivo:
        for muestra in muestras:
            archivo.write(json.dumps(muestra, ensure_ascii=False) + "\n")

    conteo = Counter(m["etiqueta"] for m in muestras)
    print(f"[ok] {len(muestras)} muestras en {args.salida}")
    for etiqueta, cantidad in sorted(conteo.items()):
        print(f"     {etiqueta}: {cantidad}")
    print("Siguiente paso: python -m meme_vision.entrenar_mano")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
