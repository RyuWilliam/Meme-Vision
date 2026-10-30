"""Descarga los modelos .task de MediaPipe en public/modelos/."""

from __future__ import annotations

from pathlib import Path
from urllib.request import urlretrieve

from .configuracion import RUTA_PUBLIC

MODELOS = {
    "gesture_recognizer.task": (
        "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/"
        "gesture_recognizer/float16/1/gesture_recognizer.task"
    ),
    "face_landmarker.task": (
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
        "face_landmarker/float16/1/face_landmarker.task"
    ),
}


def main() -> int:
    destino = RUTA_PUBLIC / "modelos"
    destino.mkdir(parents=True, exist_ok=True)
    for nombre, url in MODELOS.items():
        ruta: Path = destino / nombre
        if ruta.exists() and ruta.stat().st_size > 1_000_000:
            print(f"[ok] {nombre} ya existe ({ruta.stat().st_size / 1e6:.1f} MB)")
            continue
        print(f"[...] Descargando {nombre}")
        urlretrieve(url, ruta)
        print(f"[ok] {nombre} ({ruta.stat().st_size / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
