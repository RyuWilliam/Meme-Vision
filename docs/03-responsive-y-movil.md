# 03 · Responsive y móvil

> **Parte de la guía:** [Índice](./README.md) · **Anterior:** [02](./02-pwa-desde-cero.md) · **Siguiente:** [04](./04-vision-e-ia.md)

## 1. Qué significa “responsive”

Una interfaz responsive se adapta al tamaño de la pantalla sin crear una app distinta para cada dispositivo. En este proyecto se consigue con CSS puro, sin framework:

- **Viewport meta** en `index.html`: `width=device-width, initial-scale=1.0`.
- **Layout flexible:** `flex` y `grid` en lugar de posiciones fijas.
- **Unidades relativas:** `%`, `vw`, `vh`, `dvh`, `clamp()`, `min()`.
- **Media queries** para cambiar la estructura en puntos concretos.
- **Imágenes y videos** con `object-fit`, `aspect-ratio` y anchos máximos.

## 2. Los breakpoints reales

Todo está en `src/style.css`.

| Breakpoint | Qué cambia |
| --- | --- |
| **≤ 850 px** | Sidebar de 250 → 204 px; menos padding; el arte del hero se desplaza y baja la opacidad |
| **≤ 760 px** | La vista de gestos pasa de dos columnas (video + panel) a una sola |
| **≤ 650 px** | El layout de escritorio se convierte en móvil: sidebar superior horizontal con scroll, tarjetas en una columna, formularios apilados, cámara y gestos a pantalla completa |

### Detalle del modo móvil (≤ 650 px)

- `.app-shell` pasa de `flex` a `block`.
- `.sidebar` ocupa el 100% del ancho y se convierte en una barra superior.
- `.main-nav` se vuelve horizontal con `overflow-x: auto`.
- Se ocultan `.menu-label` y `.sidebar-bottom` para ahorrar espacio.
- `.stat-grid` pasa de 3 columnas a 1.
- `.creaciones-form` y `.creaciones-seguridad` se apilan; los inputs y botones ocupan el 100%.
- `.dlg-camara` y `.dlg-gestos` ocupan `100vw` × `100dvh`, sin bordes redondeados, con `env(safe-area-inset-bottom)` para el notch o la barra inferior.
- En la cámara móvil, al previsualizar una captura se esconde el marco en vivo y se permite scroll para que el formulario no se corte (`:has(...)`).
- En gestos, el video pasa a `aspect-ratio: 3 / 4` y el meme a `16 / 9` con altura máxima.

### Recursos CSS que conviene saber

| Recurso | Para qué se usa |
| --- | --- |
| `clamp(min, preferido, max)` | Títulos que crecen con la pantalla sin desbordarse |
| `min(92vw, 430px)` | Diálogos que nunca superan el ancho del celular |
| `100dvh` | Altura real del viewport móvil, considerando la barra del navegador |
| `env(safe-area-inset-bottom)` | Espacio para el notch/gesture bar |
| `aspect-ratio` | Video y meme mantienen proporción |
| `object-fit: cover/contain` | Recorte o ajuste del video sin deformarlo |
| `overscroll-behavior` | Evita que el fondo se mueva al hacer scroll dentro del diálogo |

## 3. La cámara en el celular

### Cómo se abre

```ts
navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: { ideal: 'environment' }, // o 'user'
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
})
```

- `facingMode: 'environment'` pide la cámara trasera; `'user'`, la frontal.
- `ideal` significa “preferido”: si el dispositivo no tiene esa cámara, el navegador elige la que haya.
- El video se muestra con `autoplay`, `playsinline` y `muted` para que funcione en móvil.
- La cámara frontal se muestra en espejo con `transform: scaleX(-1)`.

### Permisos

- El permiso se pide con `getUserMedia`, no antes.
- La app consulta el estado con `navigator.permissions.query({ name: 'camera' })` para mostrar un aviso adecuado.
- Si el usuario bloqueó el permiso, se le indica que lo habilite desde el candado de la barra de direcciones.
- Al cerrar el diálogo se detienen **todas** las pistas (`track.stop()`); si no, el LED queda encendido y la cámara sigue ocupada.

## 4. Cambio de cámara: celular vs. PC

Este es uno de los puntos que preguntaste. El comportamiento actual es:

- El botón **«Cambiar cámara»** solo aparece si `contarCamaras() >= 2`.
  - `contarCamaras()` cuenta los dispositivos `videoinput` con `enumerateDevices()`.
  - En un celular hay frontal y trasera → el botón aparece.
  - En un PC con una sola webcam → el botón se oculta.
- El cambio se hace alternando `facingMode` entre `'environment'` y `'user'`, y reabriendo el stream.
- **«Cámara en vivo» arranca en `environment` (trasera).**
- **«Gestos y filtros» arranca en `user` (frontal).**
- Cada vista tiene su propio estado; cambiar en una no cambia la otra.

### Por qué en PC no siempre funciona

`facingMode` es una **pista**, no un selector exacto de dispositivo. En un celular el navegador sabe qué cámara es frontal y cuál trasera; en un PC normalmente no. Si el PC tiene varias cámaras (webcam, cámara virtual de OBS, Windows Hello), el botón puede aparecer, pero el navegador puede seguir abriendo la misma cámara o elegir otra sin un orden predecible.

La solución técnica correcta (para una mejora futura) es:

1. Enumerar los dispositivos `videoinput` después de obtener permiso.
2. Guardar el `deviceId` de cada uno.
3. Pedir la cámara con `video: { deviceId: { exact: id } }`.
4. Mostrar un selector o ciclar por la lista.
5. Escuchar `devicechange` para actualizar la lista si se conecta/desconecta una cámara.

Eso permitiría elegir cámara explícitamente en PC y también en móvil. Hoy no está implementado; el código está optimizado para el caso móvil.

### Cómo probarlo

- **Celular real:** despliega en Cloudflare Pages (HTTPS) o usa un túnel HTTPS. Abre «Cámara en vivo» y «Gestos y filtros»; en ambos debería aparecer el botón si el teléfono tiene dos cámaras.
- **PC con una cámara:** el botón no aparece; es el comportamiento esperado.
- **PC con dos cámaras:** el botón puede aparecer; si no cambia, es la limitación de `facingMode`. No es un fallo del clasificador.
- **DevTools:** el modo dispositivo simula el layout, pero no una cámara real; para cámara usa un dispositivo o un fake device de Chromium.

## 5. La PWA en el celular

- `manifest.json` declara `orientation: "portrait"`; al instalar, la app queda vertical.
- `display: "standalone"` quita la barra del navegador.
- Los diálogos usan `100dvh` y `safe-area-inset-bottom` para no quedar debajo de la barra del sistema.
- En iOS, la instalación es manual (Compartir → Añadir a pantalla de inicio) y algunas APIs se comportan distinto; en Android/Chrome la experiencia es más completa.
- La app no es una app nativa: no hay APK ni App Store. Es una web instalable.

## 6. Cómo probar en un teléfono de verdad

| Método | Sirve para | Limitación |
| --- | --- | --- |
| DevTools → modo dispositivo | Layout, breakpoints, tamaños | No simula cámara real |
| `npm run dev -- --host` + `http://IP:5173` | Ver la UI en el teléfono | Sin HTTPS no hay cámara/SW |
| Túnel HTTPS (Cloudflare Tunnel, ngrok) | Cámara y PWA en el teléfono | Requiere configurar el túnel |
| Cloudflare Pages (producción o preview) | Prueba real completa | Requiere desplegar |
| Lighthouse móvil | Rendimiento, PWA, accesibilidad | No reemplaza la prueba manual |

Para la sustentación, la prueba más convincente es la PWA desplegada en Cloudflare Pages, instalada en un celular, con la cámara y el gesto funcionando.

## 7. Rendimiento en móvil

- La inferencia se ejecuta como máximo cada **65 ms** (~15 fps) para no saturar el hilo principal.
- MediaPipe intenta GPU y, si falla, cae a CPU.
- La primera carga de «Gestos y filtros» descarga ~12 MB de modelos `.task` y ~14,5 MB de WASM SIMD (o ~12,9 MB no-SIMD). En redes lentas puede tardar.
- En equipos de gama baja, la inferencia puede bajar los fps; el estabilizador ayuda a que el meme no parpadee.
- La app no usa Web Worker todavía: la inferencia corre en el hilo principal. Es la principal deuda de rendimiento (RNF-02).

## 8. Para la defensa

| Pregunta | Respuesta |
| --- | --- |
| ¿Cómo se hace responsive? | Con viewport meta, flex/grid, unidades relativas, `clamp()` y media queries en 850/760/650 px. |
| ¿Por qué la cámara ocupa toda la pantalla en móvil? | Para aprovechar el espacio y evitar que el formulario se corte; usa `100dvh` y safe areas. |
| ¿Por qué en PC no aparece “Cambiar cámara”? | Porque el botón solo se muestra si hay 2+ cámaras y `facingMode` no es un selector exacto en escritorio. |
| ¿Cómo se cambia de cámara correctamente? | Con `enumerateDevices()` + `deviceId` exacto; es una mejora pendiente. |
| ¿Funciona en iOS? | Sí, instalada desde Safari; la instalación y algunas APIs tienen diferencias. |
| ¿Cómo se prueba en un celular? | Con HTTPS: Cloudflare Pages o un túnel; `http://IP` no permite cámara. |

## 9. En el proyecto

- Estilos: `src/style.css` (breakpoints 850, 760, 650).
- Viewport: `index.html`.
- Cámara y permisos: `src/dispositivo.ts`.
- Cambio de cámara en la vista principal: `src/main.ts` (`facingMode`, `contarCamaras`).
- Cambio de cámara en gestos: `src/vision/ui-gestos.ts` (`facing`, `contarCamaras`).
- Manifest: `public/manifest.json`.
- Despliegue: [08 · Cloudflare Pages](./08-despliegue-cloudflare.md).

---

**Siguiente:** [04 · Visión e IA](./04-vision-e-ia.md)
