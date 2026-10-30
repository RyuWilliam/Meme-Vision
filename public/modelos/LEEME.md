# Modelos de visión

Estos archivos los consume la PWA al abrir «Gestos y filtros»:

| Archivo | Origen | Tamaño |
| --- | --- | --- |
| `gesture_recognizer.task` | MediaPipe (manos + gestos integrados) | ~8 MB |
| `face_landmarker.task` | MediaPipe (rostro + 52 blendshapes) | ~3.6 MB |
| `gestos_mlp.json` | Exportado por `nucleo` al entrenar | ~0.2–0.6 MB |

- Los `.task` se descargan con `python -m meme_vision.descargar_modelos` y no
  deben editarse.
- `gestos_mlp.json` **no** está en el repositorio hasta que grabes el dataset y
  ejecutes `python -m meme_vision.entrenar`. Sin ese archivo la app usa el motor
  de reglas.
- El Service Worker los cachea con `CacheFirst` (`/modelos/`), por lo que quedan
  disponibles sin conexión después de la primera carga.
- El WASM de MediaPipe se copia a `public/wasm/tasks-vision/` con
  `scripts/copiar-wasm.mjs` (`predev`/`prebuild`); esa carpeta no se versiona.
