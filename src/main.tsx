// main.tsx — punto de entrada de la versión React de gestIA.
//
// Lo que NO cambió respecto a la versión sin framework:
//   - src/vision/*  (MediaPipe, MLP, reglas, fusión, estabilizador, memes)
//   - src/datos/*   (IndexedDB, Web Crypto)
//   - src/dispositivo.ts (cámara, micrófono, ubicación, MediaRecorder)
//   - src/style.css (los mismos estilos y las mismas clases)
//   - public/manifest.json y la configuración de Workbox en vite.config.ts
//
// Lo que cambió: main.ts tenía 1.211 líneas que mezclaban plantilla HTML,
// querySelector, addEventListener y lógica. Aquí la UI son componentes y la
// lógica son hooks.
import './style.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

const raiz = document.querySelector<HTMLDivElement>('#app')
if (!raiz) throw new Error('No se encontró el contenedor #app.')

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
