# Evidencias — MemeVision · Guías PWA (Sesiones 17 a 21)

Capturas generadas ejecutando la app real en un servidor local (http://localhost:5173)
con su Service Worker activo. Los paneles oscuros muestran datos reales del navegador
(Service Worker, Cache Storage, Performance API).

- `sesion-17-service-worker.png` — SW registrado, `activated` y controlando la página; ciclo de vida (install / activate / fetch).
- `sesion-18-offline.png` — la app completa recargada sin conexión, servida desde el caché.
- `sesion-19-solo-cache-v2.png` — `caches.keys()` mostrando únicamente `meme-vision-v2` (sin versiones viejas).
- `sesion-20-cache-first.png` — Cache First en acción: un ícono borrado del caché se vuelve a guardar con `put()` al pedirlo.
- `sesion-21-enrutado.png` — enrutado por tipo de recurso (íconos → Cache First, /api/ → Network First, externo → Network Only, resto → SWR) con peticiones servidas por el SW.

Nota sobre la Sesión 22 (IndexedDB + Web Crypto): no está implementada en MemeVision
todavía, así que no hay captura real para esa guía. Si se necesita, primero hay que
implementarla y luego se generan las evidencias.

Nota: no son capturas de la pestaña DevTools (las herramientas de automatización no controlan
DevTools). Muestran los mismos datos que verías allí. Si el docente exige el panel exacto de
DevTools, se pueden repetir a mano con F12 → Application / Network.
