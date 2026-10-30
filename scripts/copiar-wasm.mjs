import { cpSync, existsSync, rmSync } from 'node:fs'

const origen = 'node_modules/@mediapipe/tasks-vision/wasm'
const destino = 'public/wasm/tasks-vision'

if (!existsSync(origen)) {
  console.warn('[wasm] No está @mediapipe/tasks-vision; ejecuta npm install.')
  process.exit(0)
}

rmSync(destino, { recursive: true, force: true })
cpSync(origen, destino, { recursive: true })

// El build de Vite no usa la variante de módulos ES; ahorra ~16 MB.
for (const archivo of ['vision_wasm_module_internal.js', 'vision_wasm_module_internal.wasm']) {
  rmSync(`${destino}/${archivo}`, { force: true })
}

console.log(`[wasm] MediaPipe copiado a ${destino}`)
