# Estado final — verificación de la corrección

Fecha: 2026-11-06  
App: gestIA (PWA local, Vite + TypeScript + Workbox)

## Comandos

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | Exit 0. |
| `npm test` | 30 tests / 9 archivos, todos pasan. |
| `pytest -q` en `nucleo/` | 14 tests, todos pasan. |
| `npm run build` | 28 entradas de precache, 1.951,67 KiB. |
| JS principal | 217,21 kB (66,38 kB gzip). |
| CSS | 21,78 kB (5,31 kB gzip). |
| `npm audit --omit=dev` | 0 vulnerabilidades de producción. |
| `npm audit` (tooling) | 8 de desarrollo: 3 low, 5 moderate, 0 high. |

## PWA

- Manifest enlazado y válido; iconos 192/512 y maskable, más apple-touch-icon
  180. Los iconos se generaron centrados y dentro de la zona segura maskable.
- `Page.getAppManifest`: sin errores. `Page.getInstallabilityErrors`: sin
  errores en un contexto normal de Chromium.
- Service Worker activo y controlando; el shell recarga sin red.
- `registerType: 'prompt'`: la app muestra el botón **Actualizar** cuando hay una
  versión nueva; no recarga a mitad de una captura. Verificado pulsando el botón.
- Build con `--base=/Meme-Vision/` y preview en subruta: manifest, iconos,
  service worker y scope responden bajo `/Meme-Vision/`; instalabilidad sin
  errores.
- La app tiene 12 tarjetas de gestos y el catálogo se genera desde `GESTOS`.
- `Preparar sin conexión`: descarga las dos tareas de MediaPipe y el WASM
  (~27 MB), guarda en `modelos-vision`/`wasm-vision`, marca el estado y permite
  usar gestos offline. Verificado tras borrar las cachés de runtime.
- Primer uso offline sin preparar: mensaje claro y **cámara detenida** (no queda
  una pista `live`).

## Cámara y privacidad

- La vista de gestos ya no abre la cámara al mostrar el diálogo; espera a
  «Activar cámara».
- Si falla la carga de modelos, se llama a `detenerCamara`; la pista de video
  queda en `null`.
- Al cerrar el diálogo, el `srcObject` queda en `null`.
- Al ocultar la pestaña (`visibilitychange`) se detiene la cámara, se cierra el
  diálogo de cámara y se muestra un aviso. Verificado con un evento simulado.

## Nota privada

- Contraseña mínima de 8 caracteres + confirmación.
- Verificador cifrado en IndexedDB: una contraseña incorrecta no activa el
  cifrado y no reemplaza la clave de la sesión.
- Tras un intento incorrecto, la contraseña correcta vuelve a descifrar la nota
  sin recargar (se corrigió el estado `textContent` del mensaje de error).
- La nota se guarda como `ArrayBuffer`; no aparece en texto plano.

## UI

- Se eliminaron del HTML las secciones y controles no implementados: Desafíos,
  Configuración, Notificaciones, “Ver todas”, “Explorar experiencias”, perfil y
  plan, estadísticas falsas y menciones a filtros/GIFs/cuerpo.
- El catálogo muestra los 12 gestos reales; el contador de creaciones y el estado
  de cifrado son datos reales.
- Formularios con `<label>`, diálogos con `aria-labelledby`, tabs con
  `aria-selected`, estados dinámicos con `role="status"`, alertas con
  `role="alert"` y foco visible.
- Contraste comprobado: muted/paper 4,84:1, ink-soft 7,94:1, coral-ink 4,98:1,
  placeholder 4,93:1, texto claro sobre teal 10,40:1.
- Sin overflow horizontal a 390 px (scrollWidth = clientWidth = 375 con
  scrollbar de escritorio).
- `prefers-reduced-motion` respetado.

## Límites de la verificación

- Cámara y micrófono se probaron con el dispositivo de Chromium/Playwright y
  permisos simulados; no con un teléfono físico.
- El reconocimiento de gestos se probó con el motor y el modelo de mano
  cargados; no se midió precisión con una cámara de teléfono real.
- Lighthouse móvil con throttling no se ejecutó; las métricas locales de la
  versión anterior (CLS/LCP) no sustituyen un informe de tres corridas.
- La instalación real desde el diálogo del sistema no se completó; se verificó
  la instalabilidad con el protocolo de Chrome y el flujo de `beforeinstallprompt`
  en Chromium.
