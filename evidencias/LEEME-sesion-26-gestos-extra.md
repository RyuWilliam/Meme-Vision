# Evidencias — Sesión 26: catálogo ampliado de gestos

## Qué se agregó

Un segundo modelo **solo de mano** (69 features) para reconocer gestos que no
necesitan el rostro:

`llamada`, `ok`, `peace`, `rock`, `fist`, `palm`, `stop`, `one` y `ninguno`.

`like` y `dislike` siguen resolviéndose con las reglas de MediaPipe
(`Thumb_Up` / `Thumb_Down`), y `silencio` / `mewing` con las reglas de rostro.
La app combina todo en `src/vision/fusion.ts` con prioridad explícita y ya no
acepta predicciones por debajo del umbral.

## Datos

- Fuente: `HandLandmarks.csv` de
  [Shadowfax221/HandGesture2Emoji](https://github.com/Shadowfax221/HandGesture2Emoji),
  generado con MediaPipe sobre HaGRID.
- 12.000 filas, 1.000 por clase. Se usan 8 clases (8.000 muestras) más 2.500
  negativos `ninguno` sintéticos (manos ausentes y mezclas de gestos).
- `nucleo/datos/crudo/hagrid_mano.jsonl` queda ignorado por Git porque se puede
  regenerar; el CSV original también.

## Entrenamiento

Comandos:

```powershell
cd nucleo
$env:PYTHONPATH = "src"
.\.venv\Scripts\python -m meme_vision.importar_landmarks
.\.venv\Scripts\python -m meme_vision.entrenar_mano
```

Resultado en la partición de prueba:

- Exactitud: **95,4 %**
- Macro F1: **0,960**
- F1 ponderado: **0,953**
- Umbral elegido en validación: **0,76**

Matriz de confusión: `nucleo/modelos/matriz_confusion_mano.png`.
Métricas completas: `nucleo/modelos/metricas_mano.json`.

> El split es aleatorio por frame porque el CSV público no trae sesiones ni
> personas. Las métricas son optimistas y no sustituyen una prueba con la
> cámara real. La clase `ninguno` es sintética; conviene grabar reposos reales
> con `recolectar.py` y reentrenar.

## Pruebas

- `npm test`: 28 pruebas (características, paridad, MLP, reglas, fusión,
  estabilizador y validación del JSON exportado).
- `pytest`: 14 pruebas (incluye el entrenamiento de mano con datos sintéticos).
- `npm run build`: compila y genera el precache con el modelo incluido.

## Archivos principales

- `nucleo/src/meme_vision/importar_landmarks.py`
- `nucleo/src/meme_vision/caracteristicas_mano.py`
- `nucleo/src/meme_vision/entrenar_mano.py`
- `src/vision/caracteristicas-mano.ts`
- `src/vision/fusion.ts`
- `public/modelos/gestos_mano_mlp.json`
- `src/assets/memes/<gesto>/*.png` (placeholders de OpenMoji, CC BY-SA 4.0)
