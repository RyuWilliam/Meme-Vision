// servidor-demo.mjs — sirve una de dos versiones de gestIA y permite cambiarla
// en caliente, para demostrar el ciclo de actualización de una PWA.
//
// Uso:
//   node scripts/servidor-demo.mjs                 # puerto 5220
//   node scripts/servidor-demo.mjs 5220 ./demo-version
//
// Cómo se usa en la exposición:
//   1. Arranca sirviendo lo que diga version.txt (por defecto "vanilla").
//   2. Enseña la app en el navegador y deja que el Service Worker la cachee.
//   3. Escribe "react" en version.txt (o usa /cambiar?version=react).
//   4. La app avisa «Actualizar» sola; al recargar sirve la otra versión.
//
// Es utilería de presentación, no código del producto.
import { createServer } from 'node:http'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { stat } from 'node:fs/promises'
import { join, extname, normalize, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const PUERTO = Number(process.argv[2] ?? 5220)
const BASE = process.argv[3] ?? join(AQUI, '..', 'demo-version')
const ARCHIVO_VERSION = join(BASE, 'version.txt')

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.task': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8',
}

async function versionActual() {
  try {
    const valor = (await readFile(ARCHIVO_VERSION, 'utf8')).trim()
    if (valor) return valor
  } catch {
    // Sin version.txt: se usa la primera carpeta disponible.
  }
  const carpetas = await readdir(BASE, { withFileTypes: true })
  return carpetas.find(d => d.isDirectory())?.name ?? ''
}

async function cambiarVersion(nueva) {
  await writeFile(ARCHIVO_VERSION, nueva, 'utf8')
  return nueva
}

const servidor = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://localhost:${PUERTO}`)

    // Atajo para el presentador: cambiar de versión desde el navegador.
    // Se usa en la demo si no hay segunda ventana para editar version.txt.
    if (url.pathname === '/cambiar') {
      const nueva = url.searchParams.get('version')
      if (!nueva) {
        res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Falta ?version=')
        return
      }
      await cambiarVersion(nueva)
      res.writeHead(200, { 'Content-Type': 'text/plain' }).end(`version.txt = ${nueva}`)
      return
    }

    if (url.pathname === '/estado') {
      const version = await versionActual()
      res.writeHead(200, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ version }))
      return
    }

    const version = await versionActual()
    const raiz = join(BASE, version)

    let ruta = decodeURIComponent(url.pathname)
    if (ruta === '/') ruta = '/index.html'
    const archivo = normalize(join(raiz, ruta))
    if (!archivo.startsWith(normalize(raiz))) {
      res.writeHead(403).end('Prohibido')
      return
    }

    // Si el archivo no existe, se devuelve index.html: es una SPA.
    let destino = archivo
    try {
      const info = await stat(destino)
      if (info.isDirectory()) destino = join(destino, 'index.html')
    } catch {
      destino = join(raiz, 'index.html')
    }

    const datos = await readFile(destino)
    const tipo = TIPOS[extname(destino).toLowerCase()] ?? 'application/octet-stream'

    // sw.js y el HTML NUNCA se cachean: así el navegador ve el cambio de versión
    // en la siguiente recarga. El resto sí, porque Workbox ya lo precachea.
    const sinCache = destino.endsWith('sw.js') || destino.endsWith('index.html')
    res.writeHead(200, {
      'Content-Type': tipo,
      'Cache-Control': sinCache
        ? 'no-cache, no-store, must-revalidate'
        : 'public, max-age=31536000, immutable',
      'X-Version-Servida': version,
    })
    res.end(datos)
  } catch (error) {
    res.writeHead(500).end(`Error del servidor de demo: ${error.message}`)
  }
})

servidor.listen(PUERTO, async () => {
  const version = await versionActual()
  console.log(`Servidor de demo: http://localhost:${PUERTO}`)
  console.log(`Sirviendo: ${version}`)
  console.log(`Cambiar versión: http://localhost:${PUERTO}/cambiar?version=react`)
  console.log(`Estado:         http://localhost:${PUERTO}/estado`)
})
