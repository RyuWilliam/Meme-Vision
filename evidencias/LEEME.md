# Evidencias — MemeVision · Guías PWA (Sesiones 17 a 22)

Capturas generadas ejecutando la app real en un servidor local (http://localhost:5173).
Las sesiones 17-21 llevan un aviso pequeño con datos reales del navegador (Service Worker,
Cache Storage, Performance); la 22 son capturas directas de la app en uso. No son capturas
de la pestaña DevTools (la automatización no controla DevTools): muestran los mismos datos
que verías allí.

- `sesion-17-service-worker.png` — SW registrado, `activated` y controlando la página; ciclo de vida (install / activate / fetch).
- `sesion-18-offline.png` — la app completa recargada sin conexión, servida desde el caché.
- `sesion-19-solo-cache-v2.png` — `caches.keys()` mostrando únicamente `meme-vision-v2` (sin versiones viejas).
- `sesion-20-cache-first.png` — Cache First en acción: un ícono borrado del caché se vuelve a guardar con `put()` al pedirlo.
- `sesion-21-enrutado.png` — enrutado por tipo de recurso (íconos → Cache First, /api/ → Network First, externo → Network Only, resto → SWR) con peticiones servidas por el SW.
- `sesion-22-creaciones-cifrado.png` — la sección «Mis creaciones» con una creación guardada en IndexedDB y el cifrado activo; la nota privada queda guardada cifrada (se lee solo al pulsar «Ver nota»). El detalle de la verificación está en `../auditoria/verificacion-s22.txt`.
- `sesion-22-nota-descifrada.png` — tras recargar la página e ingresar la misma contraseña, la nota privada se descifra correctamente.
