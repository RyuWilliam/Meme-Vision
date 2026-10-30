"""Recolector de landmarks para entrenar el MLP de gestos.

Abre la cámara, detecta mano y rostro con los MISMOS modelos que usa la PWA y
guarda un JSONL por sesión en `nucleo/datos/crudo/`.

Teclas:
    1  like         2  llamada      3  silencio
    4  mewing       0  reposo (sin gesto)
    Espacio  pausar/reanudar la grabación
    D  mostrar/ocultar puntos del rostro
    Q  salir

Uso:
    python -m meme_vision.recolectar --persona william
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from collections import Counter
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

from .configuracion import (
    GESTOS,
    RUTA_DATOS,
    RUTA_MODELO_MEDIAPIPE,
    RUTA_MODELO_ROSTRO,
)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

TECLAS = {
    ord("1"): "like",
    ord("2"): "llamada",
    ord("3"): "silencio",
    ord("4"): "mewing",
    ord("0"): "ninguno",
}

ROSTRO_DEBUG = (10, 13, 14, 152, 172, 397)


def _redondear(puntos, decimales: int = 5):
    return [[round(float(v), decimales) for v in p] for p in puntos]


def _categoria(categorias, indice: int = 0):
    if not categorias or not categorias[indice]:
        return None
    return categorias[indice][0]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Graba landmarks de gestos para MemeVision.")
    parser.add_argument("--persona", default="anonima", help="Nombre de quien graba")
    parser.add_argument("--camara", type=int, default=0, help="Índice de la cámara")
    parser.add_argument("--salida", type=Path, default=RUTA_DATOS)
    parser.add_argument("--sin-espejo", action="store_true", help="No reflejar la vista previa")
    args = parser.parse_args(argv)

    if not RUTA_MODELO_MEDIAPIPE.exists() or not RUTA_MODELO_ROSTRO.exists():
        print(
            "Faltan los modelos .task en public/modelos/.\n"
            "Descárgalos con: python -m meme_vision.descargar_modelos",
        )
        return 1

    opciones_mano = vision.GestureRecognizerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(RUTA_MODELO_MEDIAPIPE)),
        running_mode=vision.RunningMode.VIDEO,
        num_hands=1,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    opciones_rostro = vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(RUTA_MODELO_ROSTRO)),
        running_mode=vision.RunningMode.VIDEO,
        num_faces=1,
        output_face_blendshapes=True,
    )
    reconocedor = vision.GestureRecognizer.create_from_options(opciones_mano)
    rostro = vision.FaceLandmarker.create_from_options(opciones_rostro)

    captura = cv2.VideoCapture(args.camara, cv2.CAP_DSHOW)
    if not captura.isOpened():
        captura = cv2.VideoCapture(args.camara)
    if not captura.isOpened():
        reconocedor.close()
        rostro.close()
        print(f"No se pudo abrir la cámara {args.camara}.")
        return 1

    args.salida.mkdir(parents=True, exist_ok=True)
    sesion = time.strftime("%Y%m%d-%H%M%S")
    ruta = args.salida / f"{sesion}_{args.persona}.jsonl"
    archivo = ruta.open("w", encoding="utf-8")

    etiqueta = "ninguno"
    grabando = False
    mostrar_rostro = False
    conteo: Counter[str] = Counter()
    ultimo_guardado = 0.0
    ultimo_ts = 0
    fps = 0.0
    inicio = time.perf_counter()
    frames = 0

    print(f"Grabando en {ruta}")
    print("1 like · 2 llamada · 3 silencio · 4 mewing · 0 reposo · Espacio pausa · Q salir")

    try:
        while True:
            ok, fotograma = captura.read()
            if not ok:
                print("No se pudo leer la cámara.")
                break

            alto, ancho = fotograma.shape[:2]
            rgb = cv2.cvtColor(fotograma, cv2.COLOR_BGR2RGB)
            imagen = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            ahora_ms = int(time.monotonic() * 1000)
            if ahora_ms <= ultimo_ts:
                ahora_ms = ultimo_ts + 1
            ultimo_ts = ahora_ms

            resultado_mano = reconocedor.recognize_for_video(imagen, ahora_ms)
            resultado_rostro = rostro.detect_for_video(imagen, ahora_ms)

            mano = resultado_mano.hand_landmarks[0] if resultado_mano.hand_landmarks else None
            etiqueta_mano = _categoria(resultado_mano.handedness)
            gesto_integrado = _categoria(resultado_mano.gestures)
            puntos_rostro = resultado_rostro.face_landmarks[0] if resultado_rostro.face_landmarks else None
            blendshapes = resultado_rostro.face_blendshapes[0] if resultado_rostro.face_blendshapes else None

            if grabando and time.perf_counter() - ultimo_guardado >= 0.1:
                ultimo_guardado = time.perf_counter()
                muestra = {
                    "version": 1,
                    "sesion": sesion,
                    "persona": args.persona,
                    "etiqueta": etiqueta,
                    "timestamp": round(time.time(), 3),
                    "handedness": etiqueta_mano.category_name if etiqueta_mano else None,
                    "gesto_integrado": (
                        {
                            "nombre": gesto_integrado.category_name,
                            "confianza": round(float(gesto_integrado.score), 4),
                        }
                        if gesto_integrado
                        else None
                    ),
                    "landmarks_mano": (
                        _redondear([[p.x, p.y, p.z] for p in mano]) if mano else None
                    ),
                    "landmarks_rostro": (
                        _redondear([[p.x, p.y, p.z] for p in puntos_rostro])
                        if puntos_rostro
                        else None
                    ),
                    "blendshapes": (
                        {c.category_name: round(float(c.score), 4) for c in blendshapes}
                        if blendshapes
                        else None
                    ),
                }
                archivo.write(json.dumps(muestra, ensure_ascii=False) + "\n")
                archivo.flush()
                conteo[etiqueta] += 1

            vista = fotograma if args.sin_espejo else cv2.flip(fotograma, 1)
            if mano:
                for i, punto in enumerate(mano):
                    x = int((punto.x if args.sin_espejo else 1 - punto.x) * ancho)
                    y = int(punto.y * alto)
                    cv2.circle(vista, (x, y), 4 if i != 8 else 7, (114, 250, 216), -1)
            if mostrar_rostro and puntos_rostro:
                for i in ROSTRO_DEBUG:
                    punto = puntos_rostro[i]
                    x = int((punto.x if args.sin_espejo else 1 - punto.x) * ancho)
                    y = int(punto.y * alto)
                    cv2.circle(vista, (x, y), 3, (189, 207, 255), -1)

            frames += 1
            transcurrido = time.perf_counter() - inicio
            if transcurrido >= 1.0:
                fps = frames / transcurrido
                frames = 0
                inicio = time.perf_counter()

            estado = "GRABANDO" if grabando else "PAUSA"
            color = (114, 250, 216) if grabando else (200, 200, 200)
            cv2.putText(
                vista,
                f"{estado} · {etiqueta} · {fps:.0f} fps",
                (16, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                color,
                2,
                cv2.LINE_AA,
            )
            resumen = "  ".join(f"{g}:{conteo.get(g, 0)}" for g in GESTOS)
            cv2.putText(
                vista,
                resumen,
                (16, alto - 18),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )
            cv2.putText(
                vista,
                "1 like  2 llamada  3 silencio  4 mewing  0 reposo  ESPACIO pausa  D rostro  Q salir",
                (16, 56),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (210, 210, 210),
                1,
                cv2.LINE_AA,
            )
            cv2.imshow("MemeVision — recolección de gestos", vista)

            tecla = cv2.waitKey(1) & 0xFF
            if tecla == ord("q"):
                break
            if tecla == ord(" "):
                grabando = not grabando
                ultimo_guardado = 0.0
            elif tecla == ord("d"):
                mostrar_rostro = not mostrar_rostro
            elif tecla in TECLAS:
                etiqueta = TECLAS[tecla]
                grabando = True
                ultimo_guardado = 0.0
                print(f"Etiqueta: {etiqueta} (grabando)")
    finally:
        archivo.close()
        captura.release()
        cv2.destroyAllWindows()
        reconocedor.close()
        rostro.close()

    print(f"\nSesión guardada en {ruta}")
    print("Conteo:", dict(conteo))
    print("Siguiente paso: python -m meme_vision.entrenar")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
