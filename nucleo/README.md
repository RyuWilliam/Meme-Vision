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

La PWA detecta el JSON al abrir «Gestos y filtros» y pasa de reglas a MLP sin
tocar código. Si el archivo no existe, usa el motor de reglas geométricas.

## Vector de características (127)

| Rango     | Contenido                                                        |
| --------- | ---------------------------------------------------------------- |
| 0–62      | Mano: 21 landmarks `(x, y, z)` centrados en la muñeca y escalados |
| 63–114    | 52 blendshapes faciales (orden canónico de MediaPipe)            |
| 115–122   | Geometría mano/cara: índice-boca, índice-mentón, índice-mandíbula, alcance, pulgar-boca, boca-mentón, offset Y, offset X |
| 123–126   | Flags: mano, rostro, índice extendido, pulgar+meñique            |

La mano izquierda se refleja en X. **No se rota**: la orientación distingue
pulgar arriba de pulgar abajo.

La implementación debe mantenerse idéntica en:

- `nucleo/src/meme_vision/caracteristicas.py`
- `src/vision/caracteristicas.ts`

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
  `public/modelos/gestos_mlp.json` y recarga con el Service Worker actualizado.
