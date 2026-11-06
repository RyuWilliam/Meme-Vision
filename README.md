# Meme Vision

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

## Modelos

Los modelos de MediaPipe están en `public/modelos/`:

- `gesture_recognizer.task` y `face_landmarker.task` (MediaPipe).
- `gestos_mano_mlp.json` (MLP de mano, 69 features).
- `gestos_mlp.json` es opcional; si no existe, las expresiones de rostro se
  resuelven con reglas geométricas.

Para reentrenar, consulta `nucleo/README.md`.

## Estado actual y límites

- El catálogo incluye 12 gestos: like, llamada, silencio, mewing, ok, paz,
  rock, puño, palma, stop, uno y dislike.
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
