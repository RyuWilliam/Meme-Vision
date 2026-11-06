# Núcleo Python — MemeVision

Este paquete **no corre la app**: entrena el clasificador de gestos y exporta un
JSON pequeño que la PWA ejecuta en el navegador con MediaPipe WASM. Así la app
sigue funcionando sin conexión y el video nunca sale del dispositivo.

```
recolectar.py  →  datos/crudo/*.jsonl  →  entrenar.py  →  public/modelos/gestos_mlp.json
                                                              ↓
                                              PWA: MediaPipe + MLP en TypeScript
```

## Gestos

| Tecla | Etiqueta   | Qué se hace                                   |
| ----- | ---------- | --------------------------------------------- |
| `1`   | `like`     | Pulgar arriba                                 |
| `2`   | `llamada`  | Pulgar y meñique extendidos, resto cerrado    |
| `3`   | `silencio` | Índice vertical sobre los labios              |
| `4`   | `mewing`   | Índice tocando la mandíbula                   |
| `0`   | `ninguno`  | Mano relajada / sin gesto (clase negativa)    |

El modelo de mano (sección 3) añade además `ok`, `peace`, `rock`, `fist`,
`palm`, `stop`, `one` y `dislike`. El recolector de la cámara sigue usando solo
las teclas de la tabla porque esos gestos se entrenan con landmarks públicos;
si quieres grabar más, amplía `TECLAS` y `GESTOS_MANO`.

## Instalación

```powershell
cd nucleo
py -3.14 -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
$env:PYTHONPATH = "src"
.\.venv\Scripts\python -m meme_vision.descargar_modelos
```

> En Windows, la cámara se abre con DirectShow para arrancar más rápido. Si tu
> equipo falla, prueba `--camara 1` o usa otra entrada.

## 1. Grabar el dataset

```powershell
.\.venv\Scripts\python -m meme_vision.recolectar --persona william
```

- Elige un gesto con `1`–`4` o `0`; empieza a grabar automáticamente.
- `Espacio` pausa/reanuda, `D` muestra los puntos de la cara, `Q` sale.
- Graba **una sesión por persona y por condiciones de luz/distancia**.
- Recomendado: 3 sesiones (o 3 personas), 2 manos, 30/60/90 cm, dos fondos y
  dos luces, y al menos **50 muestras por gesto y sesión** (~20 s por gesto).

Cada línea del JSONL guarda los 21 landmarks de la mano, los 478 del rostro y
los 52 blendshapes. El dataset se guarda en `nucleo/datos/crudo/` y está
ignorado por Git (puede ser grande o privado).

## 2. Entrenar y exportar

```powershell
.\.venv\Scripts\python -m meme_vision.entrenar
```

- Divide **por sesión** (`train`/`val`/`test`), nunca por frames: así se mide
  generalización a una persona o sesión nueva.
- Aumenta solo el train: espejo, rotación ±8°, escala 0.9–1.1, ruido y jitter de
  blendshapes.
- Entrena un MLP `128 → 64`, elige el umbral en validación y evalúa en test.
- Guarda `modelos/metricas.json`, `modelos/matriz_confusion.png`,
  `modelos/mlp.joblib` y exporta **`public/modelos/gestos_mlp.json`**.

La PWA detecta los JSON al abrir «Gestos y filtros» y pasa de reglas a MLP sin
tocar código. Si no existe ninguno, usa solo el motor de reglas geométricas.

## 3. Modelo de mano para los gestos estándar

El modelo de 127 features necesita rostro y está pensado para `like`,
`llamada`, `silencio`, `mewing` y `ninguno`. Para ampliar el catálogo sin grabar
todo, hay un segundo modelo de **69 features** que solo usa la mano:

```
importar_landmarks.py  →  datos/crudo/hagrid_mano.jsonl  →  entrenar_mano.py
                                                              ↓
                                             public/modelos/gestos_mano_mlp.json
```

```powershell
cd nucleo
$env:PYTHONPATH = "src"
.\.venv\Scripts\python -m meme_vision.importar_landmarks
.\.venv\Scripts\python -m meme_vision.entrenar_mano
```

- Fuente: `HandLandmarks.csv` de
  [Shadowfax221/HandGesture2Emoji](https://github.com/Shadowfax221/HandGesture2Emoji),
  generado con MediaPipe sobre HaGRID (12.000 muestras, 1.000 por clase).
- Se usan `llamada`, `fist`, `ok`, `one`, `palm`, `peace`, `rock` y `stop`.
  `like` y `dislike` dependen de la orientación y los resuelven las reglas de
  MediaPipe (`Thumb_Up` / `Thumb_Down`). `mute` y `stop_inverted` se descartan
  porque se confunden con `one` y `stop`.
- `ninguno` se genera con negativos sintéticos (manos ausentes y mezclas de dos
  gestos). Para producción conviene grabar `0` con el recolector y volver a
  entrenar.
- El split es aleatorio por frame porque el CSV público no trae sesiones ni
  personas; las métricas son optimistas. No sustituye una evaluación con
  grabaciones propias.

La app combina ambos modelos con esta prioridad: reglas de rostro
(`silencio`/`mewing`), reglas de `like`/`dislike`/`llamada`, MLP de mano, MLP
de rostro y, por último, `ninguno`. Si un modelo no supera su umbral, no se usa.

## Vector de características (127)

| Rango     | Contenido                                                        |
| --------- | ---------------------------------------------------------------- |
| 0–62      | Mano: 21 landmarks `(x, y, z)` centrados en la muñeca y escalados |
| 63–114    | 52 blendshapes faciales (orden canónico de MediaPipe)            |
| 115–122   | Geometría mano/cara: índice-boca, índice-mentón, índice-mandíbula, alcance, pulgar-boca, boca-mentón, offset Y, offset X |
| 123–126   | Flags: mano, rostro, índice extendido, pulgar+meñique            |

La mano izquierda se refleja en X. **No se rota**: la orientación distingue
pulgar arriba de pulgar abajo.

El modelo de mano usa **69 features**: 0–62 son los 21 landmarks canónicos
(centrados, girados para que el nudillo del índice quede vertical, escalados y
reflejados si es mano izquierda), 63 indica mano presente y 64–68 son los flags
de pulgar, índice, medio, anillo y meñique extendidos.

La implementación debe mantenerse idéntica en:

- `nucleo/src/meme_vision/caracteristicas.py`
- `src/vision/caracteristicas.ts`
- `nucleo/src/meme_vision/caracteristicas_mano.py`
- `src/vision/caracteristicas-mano.ts`

## Pruebas

```powershell
.\.venv\Scripts\python -m pytest -q
```

## Problemas frecuentes

- **`No module named meme_vision`** → falta `$env:PYTHONPATH = "src"`.
- **No abre la cámara** → cierra otras apps que la usen; prueba `--camara 1`.
- **Faltan modelos** → `python -m meme_vision.descargar_modelos`.
- **Macro F1 bajo** → agrega sesiones/personas y muestras; revisa la matriz de
  confusión; el split por sesión es más exigente que uno aleatorio.
- **La PWA sigue en reglas** → verifica que exista
  `public/modelos/gestos_mano_mlp.json` (gestos estándar) o
  `public/modelos/gestos_mlp.json` (rostro), y recarga con el Service Worker
  actualizado.
