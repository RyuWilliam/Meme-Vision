# Changelog

Registro de cambios funcionales de MemeVision para el compañero que despliega en Cloudflare Pages. El proyecto no usa versiones semánticas todavía; se identifica cada entrega con la fecha y el commit.

## Cómo usarlo

- Cada entrada dice **qué cambió**, **qué se despliega** y **qué probar**.
- Para actualizar: `npm ci --include=dev` → `npm test` → `npm run build` → desplegar `dist/`.
- Si el cambio solo toca documentación, no es necesario redesplegar.
- La guía completa de despliegue está en [`docs/08-despliegue-cloudflare.md`](docs/08-despliegue-cloudflare.md).

---

## 2026-11-02 — Documentación y guía de estudio

**Commit:** cambios locales de documentación (sin commit al momento de escribir).

- Nuevo `README.md` en la raíz del repo.
- Nueva suite `docs/` con índice, PWA, responsive/móvil, visión/IA, datos, Python, arquitectura, Cloudflare Pages, organización/defensa y glosario.
- `evidencias/LEEME.md`: enlace corregido a la verificación s22 (aún no reconstruida).
- No hay cambios funcionales; **no requiere redespliegue**.

**Probar:** abrir `docs/README.md` y seguir la ruta de estudio.

---

## 2026-10-29 — Núcleo de gestos (PR #6)

**Commit:** `0dd2d7a` (merge `3614ddc`).

- Vista «Gestos y filtros» con cámara en vivo, meme, etiqueta, confianza, FPS y puntos de depuración.
- `src/vision/`: `motor.ts`, `caracteristicas.ts`, `mano.ts`, `reglas.ts`, `mlp.ts`, `estabilizador.ts`, `memes.ts`, `ui-gestos.ts`.
- `nucleo/`: recolección de landmarks, entrenamiento MLP 128→64, exportación `gestos_mlp.json` y tests.
- Modelos `.task` de MediaPipe en `public/modelos/`.
- Script `scripts/copiar-wasm.mjs` para `predev`/`prebuild`.
- Workbox: reglas de caché para `/modelos/`, `/wasm/` y `gestos_mlp.json`.
- Assets de memes en `src/assets/memes/`.

**Probar:** abrir «Gestos y filtros» con conexión, hacer un gesto, verificar `Motor: reglas (sin modelo entrenado)`. Si existe `public/modelos/gestos_mlp.json`, debe mostrar `Motor: MLP …`.

**Ojo:** los modelos `.task` y el WASM se cachean en la primera visita a la vista de gestos; sin esa visita, la visión no funciona offline.

---

## 2026-10-17 — Actualización inmediata de la PWA

**Commit:** `9454b71` (merge `e19f5e9`).

- `skipWaiting: true` y `clientsClaim: true` en Workbox.
- La app comprueba versiones nuevas al volver a la pestaña y cada hora.
- Recarga única en `controllerchange` si ya había un SW controlando.

**Probar:** desplegar un cambio, abrir la app, verificar que el SW nuevo toma el control y que la app recarga una vez.

---

## 2026-10-17 — Visor de fotos guardadas y formulario móvil

**Commit:** `c81246d` (merge `b636c46`).

- Visor de fotos/videos guardados.
- Corrección del formulario de captura en móvil.

**Probar:** guardar una foto, abrir «Ver», recargar y repetir en un celular.

---

## 2026-10-17 — Cámara responsive y cambio frontal/trasera

**Commit:** `a3e30d1` (merge `264a8a1`).

- Cámara a pantalla completa en móvil (`100dvh`, safe areas).
- Botón «Cambiar cámara» cuando hay 2+ cámaras.
- Cuadro de cámara más grande.

**Probar:** en un celular, abrir «Cámara en vivo» y alternar frontal/trasera.

---

## 2026-10-16 — Modo Foto/Vídeo con audio

**Commit:** `e1ed1ae` (merge `808f0ed`).

- Pestañas Foto y Vídeo.
- Grabación de clip con `MediaRecorder`.
- Medidor de nivel de audio.

**Probar:** grabar un clip corto, previsualizarlo y guardarlo.

---

## 2026-10-16 — APIs de dispositivo (sesión 24)

**Commit:** `9537a4b`.

- Cámara, micrófono y ubicación.
- Permisos, errores y ciclo de vida.
- `src/dispositivo.ts`.

**Probar:** conceder/denegar permisos y revisar los mensajes de error.

---

## 2026-10-09 — Migración a Workbox

**Commits:** `9d0f8d6`, `1584f7f`, merge `c28e977`.

- `vite-plugin-pwa` reemplaza el `sw.js` manual.
- Precache del shell y estrategias runtime.
- `registerSW` en `src/main.ts`.

**Probar:** `npm run build` + `npm run preview`, revisar `dist/sw.js` y el offline.

---

## 2026-09-26 — Service Worker manual y caché (sesiones 17–21)

**Commit:** `b5948d7`.

- Manifest en `public/`.
- SW versionado, limpieza de caché y estrategias Cache First / Network First / SWR.
- Evidencias de las sesiones 17–21.

**Probar:** DevTools → Application → Service Workers/Cache Storage.

---

## 2026-09-18 — Entrega inicial

**Commit:** `c1f5f4f`.

- Vite + TypeScript.
- Manifest y `sw.js` manual.
- Primera versión de la UI de MemeVision.

**Probar:** `npm install`, `npm run dev`, abrir la app.

---

## Pendiente (no desplegado todavía)

- Entrenar y exportar `public/modelos/gestos_mlp.json`.
- Precargar `.task`/WASM o añadir «Preparar modo offline».
- Web Worker para la inferencia (RNF-02).
- Guardar memes generados (RF-10), descargar/compartir (RF-11), aviso de conexión (RF-12).
- `deviceId` para cambio de cámara en PC.
- Extraer `main.ts` en módulos.

---

## Plantilla para la próxima entrada

```markdown
## AAAA-MM-DD — Título corto

**Commit:** `abc1234`.

- Cambio 1.
- Cambio 2.

**Probar:** pasos concretos.

**Ojo:** impacto en caché/offline/despliegue.
```
