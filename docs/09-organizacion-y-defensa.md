# 09 · Organización y defensa

> **Parte de la guía:** [Índice](./README.md) · **Anterior:** [08](./08-despliegue-cloudflare.md) · **Siguiente:** [Glosario](./GLOSARIO.md)

## 1. Tres capas que no se deben mezclar

El error más común en un proyecto académico es mezclar el material del curso con el producto y con las evidencias. Sepáralos así:

| Capa | Qué es | Dónde vive |
| --- | --- | --- |
| **Insumos de clase** | Guías, evaluaciones, talleres, proyectos de práctica | `00-Guias/`, `guias-electiva-pwa/`, `01-Evaluaciones/`, `02-Talleres/`, `04-Proyectos-Clase/` |
| **Producto** | El código que se ejecuta y se despliega | `03-Proyecto-Final/codigo/Meme-Vision/` |
| **Evidencias y entregas** | Capturas, verificaciones, ZIP/RAR de entrega | `03-Proyecto-Final/documentacion/`, `entregas/`, `auditoria/`, y `evidencias/` dentro del repo |

Regla práctica: **el repo debe poder clonarse y desplegarse sin la carpeta del curso**. Si un archivo no es necesario para construir o entender el producto, no va en el repo; se enlaza desde la documentación.

## 2. Qué va dentro del repo

```text
Meme-Vision/
├─ README.md              # entrada rápida
├─ docs/                  # guía de estudio y defensa (esta suite)
├─ src/                   # código de la PWA
├─ nucleo/                # entrenamiento Python
├─ public/                # manifest, íconos, modelos, assets estáticos
├─ scripts/               # copia del WASM
├─ evidencias/            # capturas de sesiones
├─ vite.config.ts
├─ package.json
└─ tsconfig.json
```

Lo que **no** debería vivir en el repo:

- PDFs de guías y talleres.
- Datasets crudos (`nucleo/datos/crudo/*.jsonl` ya está ignorado).
- Entregas ZIP/RAR.
- Fotos de reuniones o documentos administrativos.
- `node_modules`, `dist`, `.venv`, `__pycache__` (ya ignorados).

## 3. Reglas para que la documentación no se desincronice

1. **Una sola fuente de verdad por tema.** Si un tema está en `docs/04-vision-e-ia.md`, los demás documentos lo enlazan, no lo copian.
2. **El índice manda.** [`docs/README.md`](./README.md) es el mapa; si agregas un capítulo, actualiza el índice.
3. **El README es la entrada rápida.** No debe repetir los capítulos; debe decir qué es, cómo se ejecuta y dónde está la guía.
4. **Los cambios funcionales se anotan.** Lleva un `CHANGELOG.md` con fecha, commit y cambio. Es lo que necesita el compañero que despliega.
5. **Las evidencias llevan contexto.** Cada captura debe decir sesión, qué se probó y qué se esperaba.
6. **Los enlaces externos se marcan.** La especificación y la propuesta viven en `03-Proyecto-Final/documentacion/`; si el repo se clona solo, esos enlaces no existen. No los uses como única fuente de un capítulo.

## 4. Cómo estudiar el proyecto en cinco sesiones

| Sesión | Objetivo | Lectura | Práctica |
| --- | --- | --- | --- |
| 1 | Entender el producto y la PWA | 01, 02 | Abrir la app, revisar manifest, SW y caché |
| 2 | Entender la UI y el móvil | 03, 05 | Probar breakpoints, cámara, IndexedDB |
| 3 | Entender la IA | 04 | Seguir el vector de 69 hasta el MLP y comparar reglas vs. MLP |
| 4 | Entender los datos y el entrenamiento | 05, 06 | Revisar JSONL, entrenar con datos sintéticos si puedes |
| 5 | Entender el despliegue y preparar la defensa | 07, 08, 09 | Build, checklist de deploy, pitch y preguntas |

## 5. Guion de defensa

### 5.1 Pitch de 1 minuto

1. **Problema:** las apps de visión suelen subir video a un servidor; eso afecta privacidad y requiere red.
2. **Propuesta:** PWA que procesa todo en el dispositivo y convierte gestos en memes.
3. **Cómo:** MediaPipe detecta mano/rostro, el proyecto extrae 69 características de mano y clasifica con reglas o MLP.
4. **Resultado:** app instalable, offline tras la primera carga, con cámara, IndexedDB y cifrado.
5. **Resultado medido:** el MLP de mano está entrenado y en uso (69 → 128 → 64 → 10, 94,38 % de exactitud). Los gestos de rostro los resuelven las reglas.
6. **Limitación:** el split del entrenamiento es por fotograma, no por persona, así que las métricas son optimistas.

### 5.2 Demo de 5 minutos

1. Abrir la PWA desplegada (Cloudflare Pages) en el celular.
2. Mostrar la instalación o el modo standalone.
3. Abrir «Gestos y filtros» con conexión (cachear modelos).
4. Hacer un gesto y mostrar el meme, la etiqueta y la confianza.
5. Desconectar la red y repetir el gesto (si los modelos ya están cacheados).
6. Mostrar IndexedDB con una creación guardada.
7. Mostrar el código: `ui-gestos.ts` → `motor.ts` → `caracteristicas.ts` → `reglas.ts`/`mlp.ts`.

### 5.3 Explicación técnica de 10 minutos

1. Arquitectura de dos etapas: MediaPipe (percepción) + clasificador propio.
2. Vector de 69 (mano) y 127 (rostro), y la paridad Python/TS.
3. Reglas vs. MLP y prioridad de decisión.
4. Entrenamiento: dataset, split por sesión, aumento, umbral, métricas.
5. PWA: manifest, Workbox, precache/runtime cache, actualización.
6. Datos: IndexedDB, cifrado, object URLs.
7. Despliegue: `dist/`, Cloudflare Pages, HTTPS, actualización.
8. Limitaciones y roadmap.

## 6. Preguntas probables y respuestas

### Sobre la PWA

| Pregunta | Respuesta |
| --- | --- |
| ¿Qué la hace una PWA? | Manifest, Service Worker, HTTPS, instalable y offline. |
| ¿Qué pasa en `npm run dev`? | No hay SW; la PWA se prueba en `build` + `preview` o en Cloudflare Pages. |
| ¿Cómo se actualiza? | Workbox genera un SW nuevo; `skipWaiting`/`clientsClaim` toman el control y la app recarga una vez. |
| ¿Qué se cachea? | Shell y memes en precache; `.task`, WASM y modelo MLP en runtime cache. |
| ¿Funciona offline? | Sí, después de la primera carga; los modelos necesitan una primera visita a «Gestos y filtros». |
| ¿Por qué no hay backend? | Porque el objetivo es privacidad y offline; todo el cómputo es local. |

### Sobre la IA

| Pregunta | Respuesta |
| --- | --- |
| ¿Qué modelo usa? | MediaPipe GestureRecognizer y FaceLandmarker para percepción; MLP propio para clasificar gestos. |
| ¿Qué es un landmark? | Un punto anatómico con coordenadas normalizadas. |
| ¿Qué es un blendshape? | Un valor de 0 a 1 que mide una expresión facial. |
| ¿Qué es el vector de 69? | La representación numérica de la mano (21 landmarks canónicos + flag de presencia + 5 flags de dedos) que consume el MLP de mano. |
| ¿Qué es el vector de 127? | El esquema ampliado (mano, 52 blendshapes, geometría y flags) para un modelo que use el rostro; está implementado, sin modelo exportado. |
| ¿Por qué reglas y MLP? | Las reglas funcionan sin datos y son interpretables; el MLP generaliza mejor si se entrena con datos variados. |
| ¿El MLP está entrenado? | Sí, el de mano: `public/modelos/gestos_mano_mlp.json`, 69 → 128 → 64 → 10, umbral 0,90, 94,38 % de exactitud. El del esquema de 127 no está exportado. |
| ¿El teléfono ejecuta Python? | No; Python entrena en el PC; el teléfono ejecuta JS/WASM. |
| ¿Cómo evitan overfitting? | Aumento solo en train, validación y test separados y pesos balanceados. La deuda declarada es que el split es por fotograma, no por persona. |

### Sobre móvil y cámara

| Pregunta | Respuesta |
| --- | --- |
| ¿Cómo se hace responsive? | Viewport, flex/grid, `clamp()`, `100dvh`, safe areas y media queries en 850/760/650 px. |
| ¿Por qué en PC no cambia de cámara? | El botón solo aparece con 2+ cámaras y `facingMode` no es un selector exacto en escritorio. |
| ¿Cómo se arreglaría? | Enumerar `deviceId` y pedir la cámara con `deviceId: { exact }`; mostrar un selector. |
| ¿Funciona en iOS? | Sí, instalada desde Safari; la instalación y algunas APIs tienen diferencias. |
| ¿Cómo se prueba en un celular? | Con HTTPS (Cloudflare Pages o túnel); `http://IP` no permite cámara. |

### Sobre datos y seguridad

| Pregunta | Respuesta |
| --- | --- |
| ¿Dónde se guardan las creaciones? | En IndexedDB, local. |
| ¿Qué se cifra? | Solo la nota privada, con PBKDF2 + AES-GCM. |
| ¿Dónde está la contraseña? | No se guarda; la clave derivada vive en memoria. |
| ¿Qué pasa si borro los datos del sitio? | Se pierden creaciones, configuración y cachés. |
| ¿El video sale del dispositivo? | No. |

### Sobre el despliegue

| Pregunta | Respuesta |
| --- | --- |
| ¿Dónde está desplegado? | Cloudflare Pages, sirviendo `dist/` por HTTPS. |
| ¿Qué se despliega? | El build estático; no se sube el repo completo. |
| ¿Cómo se actualiza? | Push a `main` o subida manual de `dist/`; el SW se actualiza. |
| ¿Qué necesita el compañero? | `npm ci --include=dev`, `npm test`, `npm run build`, `dist/`, y la checklist de [08](./08-despliegue-cloudflare.md). |

## 7. Limitaciones y roadmap

| Prioridad | Mejora | Por qué |
| --- | --- | --- |
| Alta | Reentrenar con split por persona | El actual es por fotograma: las métricas son optimistas y no miden generalización |
| Alta | Sustituir los `ninguno` sintéticos por grabaciones reales de reposo | Hoy se generan mezclando pares de gestos |
| Alta | Precargar `.task`/WASM o botón «Preparar offline» | La demo `instalar → desconectar → gesto` falla si no se abre gestos antes |
| Media | Web Worker para la inferencia (RNF-02) | No bloquear el hilo principal |
| Media | Guardar memes generados (RF-10) y descargar/compartir (RF-11) | Cerrar requisitos funcionales |
| Media | Extraer `main.ts` en módulos | Concentra la UI heredada; difícil de mantener |
| Baja | Aviso de conexión (RF-12) | Explicar la primera carga |
| Baja | `deviceId` para cambio de cámara en PC | Mejor experiencia de escritorio |

## 8. Evidencias para la entrega

| Evidencia | Qué demuestra |
| --- | --- |
| `evidencias/sesion-17..21-*.png` | Service Worker, offline, caché y enrutado |
| `evidencias/sesion-22-*.png` | IndexedDB y cifrado |
| `evidencias/sesion-25-gestos-like.png` | Motor de reglas, mano/rostro y meme |
| `evidencias/sesion-25-gestos-offline.png` | Visión offline con modelos cacheados |
| `public/modelos/gestos_mano_mlp.json` | Modelo entrenado: 69 → 128 → 64 → 10, umbral 0,90, 94,38 % de exactitud |
| `nucleo/modelos/metricas.json` | Métricas completas del MLP |
| `nucleo/modelos/matriz_confusion.png` | Matriz de confusión |
| `npm test` / `npm run build` | Verificación técnica: 13 archivos, 65 pruebas |

**Ojo:** `auditoria/verificacion-s22.txt` está referenciado pero no existe. Hay que reconstruirlo o marcar la evidencia como no disponible; el enlace ya se corrigió en `evidencias/LEEME.md`.

## 9. Cómo comunicarte con el compañero que despliega

Mensaje tipo:

> “Cambio listo. Commit `abc1234`. Tests 65/65, build OK. Actualiza con `npm ci --include=dev && npm run build` y despliega `dist/`. Después abre la URL, revisa que el SW esté activo, entra a «Gestos y filtros» con red y prueba offline. Si algo falla, rollback al deployment anterior.”

No le pases instrucciones ambiguas como “sube los cambios”: lo que se despliega es `dist/`, no el código fuente.

## 10. Errores que conviene evitar en la defensa

- Decir “el modelo funciona con reglas” cuando el MLP de mano está entrenado y en uso.
- Decir “94 % de exactitud” sin aclarar que el split es por fotograma y que los negativos de `ninguno` son sintéticos.
- Decir “funciona offline” sin aclarar que los modelos necesitan una primera carga.
- Decir “el teléfono corre Python”.
- Confundir los `.task` de MediaPipe con el MLP del proyecto.
- Prometer que el cambio de cámara funciona igual en PC y móvil sin explicar `facingMode`.
- Decir “es una app nativa”.
- No mencionar las limitaciones: es mejor reconocerlas y explicar el roadmap.

## 11. En el proyecto

- Índice de la guía: [`docs/README.md`](./README.md).
- Estado y quick start: [`../README.md`](../README.md).
- Especificación: [`../../../documentacion/MemeVision_Especificacion_Requisitos.docx`](../../../documentacion/MemeVision_Especificacion_Requisitos.docx) (documento del curso, fuera del repo).
- Evidencias: [`../evidencias/`](../evidencias/).
- Despliegue: [08 · Cloudflare Pages](./08-despliegue-cloudflare.md).

---

**Siguiente:** [Glosario](./GLOSARIO.md)
