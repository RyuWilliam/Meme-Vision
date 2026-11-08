# gestIA

> Intelligence meets gesture.

PWA local que reconoce gestos con la cámara y los convierte en memes. Todo el
procesamiento ocurre en el navegador: el video, las fotos, los clips y las notas
no se envían a ningún servidor.

- **Frontend:** Vite + TypeScript + CSS, sin framework.
- **Visión:** MediaPipe Tasks Vision (manos, rostro y blendshapes) + un MLP
  pequeño exportado desde Python.
- **PWA:** `vite-plugin-pwa` + Workbox, manifest, instalación y offline.
- **Datos:** IndexedDB para creaciones; Web Crypto (PBKDF2 + AES-GCM) para la
  nota privada.
- **Núcleo de entrenamiento:** `nucleo/` (Python, MediaPipe, scikit-learn).

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- Para el núcleo Python: Python 3.10+ y las dependencias de
  `nucleo/requirements.txt`.

## Instalación y desarrollo

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. En desarrollo Vite sirve el código sin Service
Worker; para probar la PWA hay que compilar.

## Compilar y probar la PWA

```bash
npm run build
npm run preview
```

Abre la URL que imprime `vite preview` (por defecto `http://localhost:4173`).

> El Service Worker solo existe en el build. `npm run dev` no sirve para probar
> offline, instalación ni caché de Workbox.

### Preparar el reconocimiento sin conexión

La primera vez que se usan los gestos, la app descarga las tareas de MediaPipe
y el WASM (unos 27 MB). En la sección **Preparar para usar sin conexión** hay un
botón que hace esa descarga con progreso y guarda los archivos en las cachés de
Workbox. Después de eso, el reconocimiento funciona sin red.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo de Vite. |
| `npm run build` | TypeScript + build de producción + Service Worker. |
| `npm run preview` | Sirve el build (necesario para probar la PWA). |
| `npm test` | Tests de visión y cripto con Vitest (30 tests). |
| `npm run typecheck` | `tsc --noEmit` con `strict`. |
| `npm run icons` | Regenera los iconos PNG (requiere Pillow). |

## Tests

```bash
npm test
npm run typecheck
```

El núcleo Python tiene sus propios tests:

```bash
cd nucleo
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
$env:PYTHONPATH = "src"          # PowerShell
.\.venv\Scripts\python -m pytest -q
```

Resultados actuales: **30 tests TS/JS + 14 tests Python**.

## Estructura

```
src/
  main.ts              composición de la UI y flujos de cámara/creaciones
  style.css            sistema visual responsive
  dispositivo.ts       cámara, micrófono, ubicación y grabación
  datos/
    db.ts              IndexedDB versionada (creaciones + config)
    cripto.ts          PBKDF2 + AES-GCM
  vision/
    motor.ts           MediaPipe + fusión de reglas/MLP
    reglas.ts          gestos geométricos de respaldo
    mlp.ts             inferencia del modelo exportado
    fusion.ts          prioridad reglas/MLP
    estabilizador.ts   evita parpadeos del gesto
    ui-gestos.ts       diálogo de gestos en vivo
    offline.ts         descarga explícita de modelos/WASM
  assets/
    memes/<gesto>/     imágenes del catálogo
    fonts/             DM Sans y Space Grotesk auto-hospedadas
nucleo/                entrenamiento y exportación del modelo
public/
  manifest.json        manifest de la PWA
  assets/              iconos y screenshots
  modelos/             tareas de MediaPipe y modelo de mano
scripts/               copia de WASM y generación de iconos
```

## Privacidad y seguridad

- No hay backend, cuentas, tokens ni CORS.
- Las fotos, videos, ubicación y metadatos quedan en IndexedDB.
- Solo la nota privada se cifra con AES-GCM; la clave se deriva de la
  contraseña con PBKDF2 (100 000 iteraciones) y no se guarda.
- La contraseña se confirma al activar el cifrado y se valida con un
  verificador cifrado antes de aceptarla.
- La app pide cámara/micrófono/ubicación dentro de una acción del usuario y
  detiene el hardware al cerrar el diálogo o al ocultar la pestaña.

## Despliegue

La app debe servirse por **HTTPS** (o `localhost` para desarrollo) porque usa
cámara, micrófono, geolocalización, Web Crypto y Service Worker.

### Raíz del dominio (Vercel/Netlify/servidor propio)

```bash
npm run build
# sirve dist/ en la raíz del dominio
```

### Subruta (GitHub Pages u otro proyecto)

El manifest usa rutas relativas (`start_url: "./"`, `scope: "./"`, `assets/...`),
así que funciona en una subruta si se compila con `base`:

```bash
npm run build -- --base=/Meme-Vision/ --outDir dist
# publica dist/ en /Meme-Vision/
```

Verifica en Chrome:

1. Application → Manifest: sin errores y con los iconos 192/512/maskable.
2. Application → Service Workers: activo y con el scope correcto.
3. Network → Offline: recarga el shell.
4. Prepara los modelos y prueba los gestos sin red.

## Gestos y de dónde sale cada uno

| Gesto | Cómo se reconoce | Usa rostro | Usa mano | Modelo entrenado |
| --- | --- | --- | --- | --- |
| like / dislike | Gesto integrado de MediaPipe (`Thumb_Up`/`Thumb_Down`) + geometría de respaldo | No | Sí | No |
| llamada | Regla geométrica (pulgar + meñique) | No | Sí | No |
| silencio | Regla geométrica mano ↔ boca | Sí | Sí | No |
| mewing | Regla geométrica mano ↔ mandíbula | Sí | Sí | No |
| saludo militar | Regla geométrica mano ↔ sien | Sí | Sí | No |
| ok, peace, rock, fist, palm, stop, one, pistola | MLP de mano (69 features) | **No** | Sí | Sí |
| ninguno | Fallback del motor | — | — | — |

Los dos detectores (mano y rostro) corren en cada fotograma porque MediaPipe los
entrega juntos, pero **cada gesto se decide con la fuente que le corresponde**.
`fusion.ts` fija la prioridad: reglas de rostro → like/dislike/llamada →
MLP de mano → MLP de rostro → `ninguno`.

### Cómo hacer el saludo militar

Es el gesto más exigente de los que dependen del rostro, porque combina la mano
con una referencia facial. La postura correcta es un saludo militar de verdad:

1. **Mano plana, con la palma hacia el suelo**, en horizontal. Desde la cámara
   solo se ve el **perfil del meñique**; no es una mano de pie.
2. **La muñeca va junto a la oreja** y las puntas de los dedos apuntan hacia el
   centro de la frente. La mano queda desde media frente hacia atrás hasta la
   oreja.
3. **A la altura de la frente**: ni por encima del nacimiento del pelo ni por
   debajo de las cejas.
4. **Al menos tres dedos extendidos** (índice, medio y anillo o meñique). Una "V"
   con solo dos dedos **no** cuenta: eso es `peace`.
5. **Con la cara bien encuadrada**: si el rostro no se detecta, la regla no se
   evalúa.
6. **Mantén la posición** un instante: el estabilizador exige varios fotogramas
   seguidos antes de cambiar el meme.

| ✅ Correcto | ❌ No cuenta |
| --- | --- |
| Mano horizontal, palma al suelo, muñeca en la oreja | Palma de pie delante de la frente (taparse el sol) |
| Puntas hacia el centro de la frente | "V" de dos dedos (eso es `peace`) |
| A la altura de la frente | Mano en el pecho o encima de la cabeza |
| Muñeca cerca de la oreja | Mano abierta lejos, al lado de la cabeza |

**Por qué se exige la mano horizontal.** La versión anterior medía la distancia
de *las puntas* a la sien, que no describe esta postura: en un saludo real las
puntas están en el centro de la frente y lo que queda junto a la oreja es la
**muñeca**. Aquella regla rechazaba un saludo bien hecho y en cambio aceptaba
poner la mano de pie delante de la cara, que es justo el gesto de taparse el sol.
Ahora se miden tres cosas: inclinación horizontal del eje de la mano, posición
lateral de la muñeca y altura de la mano respecto a la frente.

### Zona muerta de los dedos (por qué no basta un umbral)

Los dedos se clasifican por el ángulo de su articulación intermedia (PIP), en
grados: 180 es recto y 90 es un ángulo recto. Un único umbral en 150 causaba dos
problemas a la vez, medidos sobre las 11.500 muestras de HaGRID:

| Umbral único 150 | Efecto |
| --- | --- |
| Un dedo a 145° contaba como **cerrado** | La mano plana no se detectaba → el saludo no salía |
| Índice, medio y anillo bajo 150 bastaban para `llamada` | Al hacer el saludo saltaba una llamada falsa |

Ahora hay una **zona muerta** con dos umbrales:

```
   > 140°  → claramente EXTENDIDO
   < 110°  → claramente CERRADO
110–140°  → no se afirma nada (zona muerta)
```

Cada regla usa el umbral que necesita: el saludo pide dedos extendidos (>140) y
la llamada exige los tres dedos claramente doblados (<110).

**No confundir con el modelo.** `extensiones()` sigue usando **150** porque
alimenta los flags 64..68 del MLP de mano, y el entrenamiento en Python usa ese
mismo valor (`nucleo/src/meme_vision/geometria.py`). Cambiarlo rompería la
paridad entre entrenamiento e inferencia. Las reglas geométricas usan
`extensionesRegla()`, con 140. El test `umbrales.test.ts` fija esa separación.

Efecto medido al pasar de 150/150 a 140/110:

| Escenario (ruido normal de MediaPipe) | Antes | Ahora |
| --- | --- | --- |
| Saludo detectado con mano plana en la sien | 58% | **86%** |
| Llamada falsa al intentar el saludo | 0.4% | **0%** |
| Falsos positivos de llamada sobre el dataset real | 12 | **2** |

## Cómo cambiar o agregar una imagen de meme

Cada gesto tiene una carpeta en `src/assets/memes/<gesto>/`:

```
src/assets/memes/
  like/like_01.png
  saludo/saludo_01.png
  ok/ok_01.png
  ...
  _sin_gesto/esperando.png
```

**Reglas:**

1. Formato **PNG**.
2. Máximo **512×512 px** y menos de **200 KB**.
3. El nombre debe ser `<gesto>_<variante>.png`, sin espacios. Ejemplos:
   `like_01.png`, `like_02.png`, `saludo_02.png`.
4. Puedes poner varias variantes del mismo gesto: la app rota entre ellas.
5. **No hay que tocar código ni `vite.config.ts`**: Vite procesa la carpeta, le
   pone hash a la imagen y el Service Worker la incluye en el precaché.

**Reemplazar una imagen:** sobrescribe el archivo con el mismo nombre
(`like_01.png`) o agrega una variante nueva. Vuelve a compilar:

```bash
npm run build
npm run preview
```

> Si tienes la app abierta en el navegador, pulsa **Actualizar** cuando aparezca,
> porque el Service Worker habrá detectado la versión nueva.

**Agregar un gesto nuevo que solo use la mano** (por ejemplo `thumbs_middle`):

1. Añade la clave en `GestoId` y en `GESTOS` (`src/vision/tipos.ts`).
2. Crea la carpeta y la imagen: `src/assets/memes/<gesto>/<gesto>_01.png`.
3. Si el gesto debe salir del MLP, agrégalo a `GESTOS_MANO` en
   `src/vision/tipos.ts` y en `nucleo/src/meme_vision/configuracion.py`, y
   reentrena (ver `nucleo/README.md`). Si es una regla geométrica, añádela en
   `src/vision/reglas.ts` y su test en `src/vision/reglas.test.ts`.

**Agregar un gesto que use cara + mano** (como `silencio`, `mewing` o
`saludo`): no necesita reentrenar. Se implementa como regla geométrica en
`src/vision/reglas.ts` usando landmarks de `ROSTRO` y de la mano, y se agrega a
la prioridad de `src/vision/fusion.ts`.

## Modelos

Los modelos de MediaPipe están en `public/modelos/`:

- `gesture_recognizer.task` y `face_landmarker.task` (MediaPipe).
- `gestos_mano_mlp.json` (MLP de mano, 69 features).
- `gestos_mlp.json` es opcional; si no existe, las expresiones de rostro se
  resuelven con reglas geométricas.

Para reentrenar, consulta `nucleo/README.md`.

## Estado actual y límites

- El catálogo incluye 14 gestos: like, llamada, silencio, mewing, saludo
  militar, ok, paz, rock, puño, palma, stop, uno, pistola y dislike.
- El reconocimiento de gestos necesita los modelos de MediaPipe. El shell de la
  app funciona offline; el reconocimiento offline requiere preparar los modelos.
- No hay notificaciones push, sincronización con servidor, cuentas ni desafíos:
  no forman parte del alcance actual y no se muestran como funciones activas.
- El modelo de mano se entrenó con landmarks públicos; las métricas son
  optimistas respecto a una cámara real. Ver `nucleo/README.md`.
- MediaPipe 1.2.2 usa WebAssembly SIMD. Navegadores muy antiguos sin SIMD no
  podrán ejecutar el motor de gestos; el shell de la PWA sí carga.

## Verificación recomendada antes de entregar

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run preview
```

Además, prueba en Chrome:

- instalar la app desde el icono de instalación;
- recargar en offline y comprobar el shell;
- preparar modelos y repetir gestos offline;
- activar/desactivar cámara, cambiar de pestaña y cerrar con Esc;
- guardar una nota, recargar, equivocarte de contraseña y volver a intentar;
- revisar que no haya overflow a 390 px.
