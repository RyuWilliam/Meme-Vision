# MemeVision · Guía del proyecto

Guía de estudio y defensa para entender **qué hace MemeVision, cómo lo hace y por qué está construido así**. Está pensada para alguien que no asume conocimiento previo de PWA, visión artificial ni WebAssembly: cada capítulo explica el concepto desde cero y después lo aterriza en el código real.

> **Proyecto:** PWA de visión artificial on-device que convierte gestos de mano y rostro en memes.
> **Repositorio:** `03-Proyecto-Final/codigo/Meme-Vision`
> **Despliegue actual:** Cloudflare Pages.
> **Estado:** funciona con el motor de reglas; el MLP está implementado pero aún no se ha entrenado/exportado.

---

## Para quién es

- **Para ti, para estudiar y defender el proyecto.** Los capítulos explican los conceptos y luego muestran dónde están en el código y qué decir en la sustentación.
- No es un manual de usuario ni una API de referencia. Para ejecutar el proyecto, el [`README.md`](../README.md) del repo es más directo.

## Cómo usarla

| Si tienes... | Ruta recomendada |
| --- | --- |
| 10 minutos | [01](./01-que-es-memevision.md) → [04](./04-vision-e-ia.md) → [Glosario](./GLOSARIO.md) |
| Una tarde | 01 → 02 → 03 → 04 → 07 |
| Vas a exponer | 01 → 04 → 07 → [09 · Defensa](./09-organizacion-y-defensa.md) |
| Vas a desplegar | [08 · Cloudflare Pages](./08-despliegue-cloudflare.md) → [02](./02-pwa-desde-cero.md) |
| Quieres entender el entrenamiento | [06](./06-nucleo-python.md) → [04](./04-vision-e-ia.md) |

## Mapa de capítulos

| # | Capítulo | Qué responde |
| --- | --- | --- |
| 01 | [Qué es MemeVision](./01-que-es-memevision.md) | Problema, propuesta, alcance, flujo de usuario y demo |
| 02 | [PWA desde cero](./02-pwa-desde-cero.md) | Manifest, Service Worker, Workbox, offline, instalación y HTTPS |
| 03 | [Responsive y móvil](./03-responsive-y-movil.md) | Cómo se adapta a pantallas, cámara en celular, permisos, iOS/Android y pruebas reales |
| 04 | [Visión e IA](./04-vision-e-ia.md) | MediaPipe, landmarks, blendshapes, vectores de 69 y 127, reglas, MLP entrenado y entrenamiento |
| 05 | [Datos y almacenamiento](./05-datos-y-almacenamiento.md) | IndexedDB, Web Crypto, blobs, object URLs y límites |
| 06 | [Núcleo Python](./06-nucleo-python.md) | Dataset, recolección, entrenamiento, exportación y artefactos |
| 07 | [Arquitectura y flujo](./07-arquitectura-y-flujo.md) | Diagramas de secuencia, contratos de datos, módulos, inventario heredado/nuevo y brechas |
| 08 | [Despliegue en Cloudflare Pages](./08-despliegue-cloudflare.md) | Build, variables, caché, headers, actualización manual, rollback y checklist |
| 09 | [Organización y defensa](./09-organizacion-y-defensa.md) | Cómo separar materia/proyecto/evidencias y cómo exponer el proyecto |
| — | [Glosario](./GLOSARIO.md) | Términos técnicos en una línea, con su uso en el proyecto |

## Convenciones

- `así` = nombre de archivo, comando o ruta del proyecto.
- **Idea clave** = lo mínimo que debes poder explicar.
- **En el proyecto** = dónde está implementado.
- **Para la defensa** = cómo responder si te preguntan por eso.
- **Ojo** = limitación o error común.

## Las tres ideas que debes poder explicar

1. **Es una PWA real:** se instala, tiene manifest, Service Worker, caché y funciona offline después de la primera carga. No es una app nativa ni necesita backend.
2. **La visión ocurre en el dispositivo:** la cámara entrega video al navegador; MediaPipe (WASM) detecta manos y rostro; el proyecto convierte esos puntos en 69 números (mano) o 127 (mano + rostro) y clasifica el gesto con reglas o con un MLP. El video nunca se sube a un servidor.
3. **El MLP está entrenado:** `public/modelos/gestos_mano_mlp.json` (69 → 128 → 64 → 10, umbral 0,90, 94,38 % de exactitud) resuelve los gestos de mano; las reglas geométricas resuelven los de rostro y hacen de respaldo bajo el umbral. Python solo se usa en el PC para importar datos y entrenar; el teléfono no ejecuta Python.

## Ruta de estudio sugerida

| Sesión | Lee | Practica |
| --- | --- | --- |
| 1 | 01 y 02 | Abre `npm run dev`, recorre la UI y el manifest |
| 2 | 03 y 05 | Prueba el layout en DevTools y revisa IndexedDB |
| 3 | 04 | Sigue el vector de 69 desde `ui-gestos.ts` hasta `mlp.ts`, y cómo entra en juego el fusor con las reglas |
| 4 | 06 y 07 | Ejecuta el flujo de entrenamiento con datos sintéticos o revisa los tests |
| 5 | 08 y 09 | Prepara la demo, el pitch y las preguntas de defensa |

## Estado actual (2026-11-22)

- `npm test`: 65 pruebas TypeScript en 13 archivos, todas en verde.
- `npm run build`: correcto; 30 entradas de precaché y `dist/sw.js`.
- Prueba en navegador: shell, Service Worker, diálogo de gestos e IndexedDB funcionando.
- El **MLP de mano está entrenado y en uso**: `public/modelos/gestos_mano_mlp.json` (69 → 128 → 64 → 10, umbral 0,90, 94,38 % de exactitud). Los gestos que dependen del rostro los resuelven las reglas.
- Pendientes principales: inferencia en Web Worker (RNF-02), precarga de modelos para la demo offline, guardar memes generados, descargar/compartir y aviso de conexión.

## Documentos que complementan esta guía

- [`../README.md`](../README.md) — inicio rápido y mapa de módulos del repo.
- [`../nucleo/README.md`](../nucleo/README.md) — comandos y decisiones del entrenamiento.
- [`../../../documentacion/MemeVision_Especificacion_Requisitos.docx`](../../../documentacion/MemeVision_Especificacion_Requisitos.docx) — especificación formal (curso).
- [`../../../documentacion/MemeVision_Propuesta_PWA.pptx`](../../../documentacion/MemeVision_Propuesta_PWA.pptx) — propuesta inicial (curso).
- [`../evidencias/`](../evidencias/) — capturas de las sesiones.

---

**Siguiente:** [01 · Qué es MemeVision](./01-que-es-memevision.md)
