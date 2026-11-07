# Modelos de visión

Estos archivos los consume la PWA al abrir «Gestos y filtros»:

| Archivo | Origen | Tamaño |
| --- | --- | --- |
| `gesture_recognizer.task` | MediaPipe (manos + gestos integrados) | ~8 MB |
| `face_landmarker.task` | MediaPipe (rostro + 52 blendshapes) | ~3.6 MB |
| `gestos_mano_mlp.json` | Modelo de mano (69 features) entrenado con landmarks públicos | ~0.4 MB |
| `gestos_mlp.json` | Modelo de rostro (127 features) entrenado con tu dataset | ~0.2–0.6 MB |

- Los `.task` se descargan con `python -m meme_vision.descargar_modelos` y no
  deben editarse.
- `gestos_mano_mlp.json` se genera con
  `python -m meme_vision.importar_landmarks` y
  `python -m meme_vision.entrenar_mano`. Cubre `llamada`, `ok`, `peace`, `rock`,
  `fist`, `palm`, `stop`, `one` y `ninguno`.
- `gestos_mlp.json` **no** está en el repositorio hasta que grabes el dataset y
  ejecutes `python -m meme_vision.entrenar`. Sin ese archivo, `silencio` y
  `mewing` se resuelven con las reglas geométricas.
- La app puede funcionar con uno, con otro o con ninguno de los dos JSON.
- El Service Worker los cachea con `CacheFirst` (`/modelos/`). Para que el
  reconocimiento funcione en el primer uso offline, la página ofrece el botón
  **Preparar sin conexión**: descarga las dos tareas y el WASM (unos 27 MB)
  con progreso antes de usarlas sin red.
- El WASM de MediaPipe se copia a `public/wasm/tasks-vision/` con
  `scripts/copiar-wasm.mjs` (`predev`/`prebuild`); esa carpeta no se versiona.
