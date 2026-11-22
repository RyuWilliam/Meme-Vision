# 08 · Despliegue en Cloudflare Pages

> **Parte de la guía:** [Índice](./README.md) · **Anterior:** [07](./07-arquitectura-y-flujo.md) · **Siguiente:** [09](./09-organizacion-y-defensa.md)

## 1. Qué necesita MemeVision para desplegarse

MemeVision es **estático**: no tiene backend ni funciones de servidor. El build produce una carpeta `dist/` con:

```text
dist/
├─ index.html
├─ assets/           # JS, CSS, memes con hash
├─ assets/           # íconos y screenshots del manifest
├─ modelos/          # .task de MediaPipe + gestos_mlp.json (si existe)
├─ wasm/tasks-vision/# runtime WASM copiado por el script
├─ manifest.json
├─ sw.js             # Service Worker generado por Workbox
└─ workbox-*.js
```

Cloudflare Pages sirve esa carpeta por HTTPS en el dominio raíz. No se ejecuta Python ni Node en producción.

## 2. Configuración del proyecto en Cloudflare Pages

Si el proyecto de Pages está conectado al repositorio **`Meme-Vision`**:

| Ajuste | Valor |
| --- | --- |
| Framework preset | None / Vite (si está disponible) |
| Build command | `npm ci --include=dev && npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (raíz del repo) |
| Node version | `NODE_VERSION=24` (o `22.12+`; Vite 8 exige `^20.19` o `>=22.12`) |

Si Pages está conectado a un monorepo que contiene `03-Proyecto-Final/codigo/Meme-Vision`, configura el **Root directory** en `03-Proyecto-Final/codigo/Meme-Vision` y usa el mismo build command/output.

### Por qué `npm ci --include=dev`

En CI es común que `NODE_ENV=production` haga que `npm ci` omita las `devDependencies`. Este proyecto necesita `typescript`, `vite` y `vitest` para compilar. `--include=dev` fuerza su instalación. En local nos pasó exactamente eso: `npm install` instaló solo 2 paquetes hasta usar `--include=dev`.

Alternativa: definir `NODE_ENV=development` en las variables de entorno del proyecto. La opción `--include=dev` es más explícita.

### Variables de entorno

No se necesitan secretos ni variables de aplicación. Solo la versión de Node:

| Variable | Valor | Motivo |
| --- | --- | --- |
| `NODE_VERSION` | `24` | Coincide con el entorno verificado; Vite 8 requiere `>=22.12` |

No pongas claves, tokens ni rutas absolutas de tu máquina.

## 3. Caché y headers

Cloudflare Pages sirve los archivos estáticos con `Cache-Control: public, max-age=0, must-revalidate` por defecto. Para una PWA conviene afinar:

- `sw.js` e `index.html` deben revalidarse siempre.
- Los assets con hash pueden cachearse de forma agresiva (`immutable`).
- Los modelos `.task` y el WASM pueden cachearse, pero si los actualizas, el SW `CacheFirst` puede seguir sirviendo la versión vieja hasta que expire o cambies la caché.

Puedes crear `public/_headers` (se copia a `dist/_headers` y Cloudflare Pages lo interpreta):

```text
/sw.js
  Cache-Control: no-cache

/index.html
  Cache-Control: no-cache

/manifest.json
  Cache-Control: no-cache

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/modelos/*
  Cache-Control: public, max-age=86400

/wasm/*
  Cache-Control: public, max-age=86400
```

**Ojo:** este archivo no está incluido todavía en el repo. Es una recomendación para el despliegue; si se agrega, hay que verificar que no rompa la actualización del SW.

También puedes añadir headers de seguridad razonables:

```text
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(self), microphone=(self), geolocation=(self)
```

No agregues una CSP estricta sin probar MediaPipe/WASM; puede bloquear `blob:` o `wasm-unsafe-eval`.

### MIME types

- `.wasm` debe servirse como `application/wasm` para que el navegador pueda instanciarlo de forma eficiente.
- `.task` se descarga como binario (`application/octet-stream` está bien).
- `.json` como `application/json`.

Cloudflare Pages normalmente detecta bien las extensiones; si la consola muestra errores de MIME, revisa con `curl -I`.

## 4. Primera publicación: checklist

1. `npm ci --include=dev`
2. `npm test` → 65/65.
3. `npm run build` → revisar que existan `dist/sw.js`, `dist/manifest.json`, `dist/modelos/` y `dist/wasm/`.
4. Subir/desplegar `dist/`.
5. Abrir la URL de producción en HTTPS.
6. Verificar en DevTools:
   - Manifest sin errores.
   - Service Worker `activated and running`.
   - Cache Storage con `workbox-precache`.
7. Abrir «Gestos y filtros» con conexión para cachear `.task` y WASM.
8. Probar offline: DevTools → Offline → recargar → abrir gestos.
9. Probar en un celular real: cámara, permisos, cambio frontal/trasera.
10. Instalar la PWA y repetir la demo.

## 5. Actualización manual

### Opción A: integración con Git (recomendada)

Si Pages está conectado al repo, cada push a `main` construye y despliega. El compañero no sube archivos a mano; solo verifica el deployment.

- Producción: rama `main`.
- Preview: otras ramas/PR.
- Rollback: desde el dashboard, seleccionar un deployment anterior.

### Opción B: subida directa con Wrangler

```bash
npm run build
npx wrangler pages deploy dist --project-name=meme-vision
```

Requiere autenticación de Wrangler y permisos del proyecto. Es útil si el compañero no tiene acceso al repo.

### Opción C: `dist.zip`

Si le envías un ZIP, debe contener el **contenido** de `dist/`, no la carpeta padre. Incluye siempre:

- SHA del commit.
- Fecha.
- Nota de cambios (`CHANGELOG.md`).
- Resultado de `npm test` y `npm run build`.

## 6. Cómo se actualiza la PWA para los usuarios

1. Se despliega un `sw.js` nuevo.
2. El navegador lo instala y, con `skipWaiting` + `clientsClaim`, toma el control.
3. La app escucha `controllerchange` y recarga una vez si ya había un SW controlando.
4. La app también busca actualizaciones al volver a la pestaña y cada hora.
5. Si la PWA está instalada y offline, el usuario no verá la actualización hasta volver a tener red.

**Consejo para la demo:** antes de exponer, abre la app con conexión, deja que actualice, cierra y vuelve a abrir. Así evitas que un SW viejo sirva una versión anterior.

## 7. Límites de Cloudflare Pages

| Límite | Valor | ¿Nos afecta? |
| --- | --- | --- |
| Archivos por sitio (Free) | 20 000 | No: el build genera pocas decenas |
| Tamaño máximo por archivo | 25 MiB | No: el mayor es el WASM SIMD (~14,5 MB) |
| Reglas en `_headers` | 100 | No: usamos pocas |
| Caracteres por línea en `_headers` | 2 000 | No |
| Builds por mes (Free) | 500 | No para un proyecto académico |
| Timeout de build | 20 min | No: el build tarda segundos |
| Proyectos por cuenta | 100 | No |

Si algún día agregas videos de memes grandes, revisa el límite de 25 MiB por archivo y considera R2.

## 8. Problemas frecuentes en Cloudflare Pages

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `tsc: not found` o `vite: not found` | `npm ci` omitió devDependencies | Build command `npm ci --include=dev && npm run build` |
| `Cannot find module '...'` | Node incompatible | `NODE_VERSION=24` o `22.12+` |
| 404 en `/modelos/...` | No se copió `public/modelos` o el build falló | Revisa `dist/modelos` y el log |
| 404 en `/wasm/...` | `prebuild` no copió el WASM | Ejecuta `npm run build` y revisa `public/wasm/tasks-vision` |
| La app vieja sigue | SW/caché del navegador | Cierra pestañas, fuerza actualización, revisa Application → Service Workers |
| La cámara no abre | Estás en HTTP o el permiso está bloqueado | Usa HTTPS y revisa el candado del navegador |
| El manifest no instala | Íconos 404 o `start_url`/`scope` incorrectos | Revisa `manifest.json` y que la app esté en la raíz |
| El build tarda o falla | Copia de WASM pesada o Node mal configurado | Revisa logs; el WASM son ~28 MB en disco, pero se copia rápido |

## 9. Handoff con el compañero que despliega

Lo mínimo que debe saber:

- **No se despliega el repo completo**: se despliega `dist/`.
- **Build:** `npm ci --include=dev && npm run build`.
- **Node:** 24 (o 22.12+).
- **Salida:** `dist`.
- **URL de producción:** la de Cloudflare Pages (no la de preview).
- **Tras cada cambio:** tests + build + deploy + smoke test.
- **Si algo falla:** rollback al deployment anterior desde el dashboard.
- **No hace falta Python** para desplegar; el JSON del MLP, si existe, va dentro de `public/modelos/`.
- **La primera visita a «Gestos y filtros»** debe ser con red para cachear modelos y WASM.

Checklist corto para pegar en el chat del equipo:

```text
[ ] git pull / recibir dist.zip con SHA
[ ] npm ci --include=dev
[ ] npm test (65/65)
[ ] npm run build
[ ] verificar dist/sw.js, dist/modelos, dist/wasm
[ ] deploy a Cloudflare Pages (producción)
[ ] abrir URL, revisar consola y SW
[ ] probar cámara en celular
[ ] abrir «Gestos y filtros» online
[ ] probar offline
[ ] anotar commit, fecha y cambios
```

## 10. Para la defensa

| Pregunta | Respuesta |
| --- | --- |
| ¿Dónde está desplegado? | Cloudflare Pages, sirviendo `dist/` por HTTPS. |
| ¿Qué se despliega? | El build estático: HTML, JS, CSS, WASM, modelos y SW. |
| ¿Hay backend? | No; todo el procesamiento es en el cliente. |
| ¿Cómo se actualiza? | Push a `main` (o subida manual de `dist/`); el SW se actualiza y recarga. |
| ¿Por qué Cloudflare Pages? | Hosting estático, HTTPS, CDN y despliegues por Git sin administrar servidor. |
| ¿Qué pasa con los modelos? | Se cachean en la primera visita a «Gestos y filtros»; el SW los sirve offline. |

## 11. En el proyecto

- Configuración de build: `package.json`, `vite.config.ts`.
- Salida: `dist/`.
- WASM: `scripts/copiar-wasm.mjs`.
- Modelos: `public/modelos/`.
- Manifest: `public/manifest.json`.
- PWA y caché: [02 · PWA desde cero](./02-pwa-desde-cero.md).

---

**Siguiente:** [09 · Organización y defensa](./09-organizacion-y-defensa.md)
