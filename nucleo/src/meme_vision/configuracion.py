"""Constantes compartidas por el núcleo de entrenamiento y la app web."""

from pathlib import Path

GESTOS = ("like", "llamada", "silencio", "mewing", "ninguno")

# Catálogo del modelo de mano: gestos que se distinguen solo con los 21
# landmarks. `like` y `dislike` se resuelven con las reglas de MediaPipe
# (Thumb_Up / Thumb_Down) porque dependen de la orientación; `silencio` y
# `mewing` necesitan el rostro y los resuelve el motor de reglas.
# (`saludo` también usa rostro + mano, pero solo existe en el motor de reglas
# de la PWA: no es una clase del dataset de entrenamiento.)
GESTOS_MANO = (
    "llamada",
    "ok",
    "peace",
    "rock",
    "fist",
    "palm",
    "stop",
    "one",
    "ninguno",
)

# Debe coincidir exactamente con src/vision/tipos.ts y con el orden que exporta
# el modelo. El orden canónico es el de MediaPipe Face Landmarker.
CATEGORIAS_ROSTRO = (
    "_neutral",
    "browDownLeft",
    "browDownRight",
    "browInnerUp",
    "browOuterUpLeft",
    "browOuterUpRight",
    "cheekPuff",
    "cheekSquintLeft",
    "cheekSquintRight",
    "eyeBlinkLeft",
    "eyeBlinkRight",
    "eyeLookDownLeft",
    "eyeLookDownRight",
    "eyeLookInLeft",
    "eyeLookInRight",
    "eyeLookOutLeft",
    "eyeLookOutRight",
    "eyeLookUpLeft",
    "eyeLookUpRight",
    "eyeSquintLeft",
    "eyeSquintRight",
    "eyeWideLeft",
    "eyeWideRight",
    "jawForward",
    "jawLeft",
    "jawOpen",
    "jawRight",
    "mouthClose",
    "mouthDimpleLeft",
    "mouthDimpleRight",
    "mouthFrownLeft",
    "mouthFrownRight",
    "mouthFunnel",
    "mouthLeft",
    "mouthLowerDownLeft",
    "mouthLowerDownRight",
    "mouthPressLeft",
    "mouthPressRight",
    "mouthPucker",
    "mouthRight",
    "mouthRollLower",
    "mouthRollUpper",
    "mouthShrugLower",
    "mouthShrugUpper",
    "mouthSmileLeft",
    "mouthSmileRight",
    "mouthStretchLeft",
    "mouthStretchRight",
    "mouthUpperUpLeft",
    "mouthUpperUpRight",
    "noseSneerLeft",
    "noseSneerRight",
)

ROSTRO = {
    "frente": 10,
    "labio_superior": 13,
    "labio_inferior": 14,
    "menton": 152,
    "mandibula_izquierda": 172,
    "mandibula_derecha": 397,
}

MANO_PUNTOS = 21
TAMANO_ENTRADA = MANO_PUNTOS * 3 + len(CATEGORIAS_ROSTRO) + 8 + 4
# 63 coordenadas + mano presente + 5 flags de dedos extendidos.
TAMANO_ENTRADA_MANO = MANO_PUNTOS * 3 + 6

RUTA_NUCLEO = Path(__file__).resolve().parents[2]
RUTA_RAIZ = RUTA_NUCLEO.parent
RUTA_PUBLIC = RUTA_RAIZ / "public"
RUTA_MODELO_WEB = RUTA_PUBLIC / "modelos" / "gestos_mlp.json"
RUTA_MODELO_MANO_WEB = RUTA_PUBLIC / "modelos" / "gestos_mano_mlp.json"
RUTA_MODELO_MEDIAPIPE = RUTA_PUBLIC / "modelos" / "gesture_recognizer.task"
RUTA_MODELO_ROSTRO = RUTA_PUBLIC / "modelos" / "face_landmarker.task"
RUTA_DATOS = RUTA_NUCLEO / "datos" / "crudo"
RUTA_DATOS_PUBLICOS = RUTA_NUCLEO / "datos" / "publicos"
RUTA_MODELOS = RUTA_NUCLEO / "modelos"
