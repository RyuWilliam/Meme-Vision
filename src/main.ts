import './style.css'
import { registerSW } from 'virtual:pwa-register'
import {
  abrirBaseDeDatos,
  guardarCreacion,
  guardarCreacionConNota,
  obtenerTodasLasCreaciones,
  eliminarCreacion,
  leerNotaPrivada,
  guardarConfig,
  obtenerConfig,
} from './datos/db.ts'
import type { Creacion } from './datos/db.ts'
import { derivarClaveDesdeContrasena } from './datos/cripto.ts'

// Migración a Workbox (patrón de la Sesión 34): el SW lo genera
// vite-plugin-pwa en cada build; el registro usa el módulo virtual del plugin
// en lugar del sw.js manual de las guías 17-21.
registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    console.log('SW de Workbox registrado:', swUrl, registration)
  },
  onRegisterError(error) {
    console.error('Error al registrar el SW de Workbox:', error)
  },
})

const icon = (name: string) => {
  const paths: Record<string, string> = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    upload: '<path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M5 20h14"/>',
    images: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m4 17 4-4 3 3 2-2 4 3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    camera: '<path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"/><circle cx="12" cy="12.5" r="3.5"/>',
    face: '<circle cx="12" cy="12" r="8.5"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/><path d="M8.5 14c2 2 5 2 7 0"/>',
    challenge: '<path d="m12 3 2.4 5.1L20 9l-4 4 .9 5.7-4.9-2.7-4.9 2.7L8 13l-4-4 5.6-.9L12 3Z"/><path d="M5 20h14"/>',
    settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m19 15-1.2-.7.1-1.3 1.1-.8-1.6-2.8-1.3.5-1-.9.1-1.4h-3.2l-.2 1.4-1 .9-1.3-.5-1.6 2.8 1.1.8.1 1.3-1.2.7 1.6 2.8 1.3-.5 1 .9.2 1.4h3.2l.1-1.4 1-.9 1.3.5L19 15Z"/>',
    spark: '<path d="m12 3 1.3 5.7L19 10l-5.7 1.3L12 17l-1.3-5.7L5 10l5.7-1.3L12 3Z"/><path d="m19 3 .4 1.6L21 5l-1.6.4L19 7l-.4-1.6L17 5l1.6-.4L19 3Z"/>'
  }
  return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="app-shell">
  <aside class="sidebar">
    <a class="brand" href="#" aria-label="Meme Vision inicio"><span class="brand-mark">${icon('spark')}</span><span>Meme<span>Vision</span></span></a>
    <p class="menu-label">Explora MemeVision</p>
    <nav class="main-nav" aria-label="Navegación principal">
      <a class="nav-item active" href="#">${icon('grid')} <span>Inicio</span></a>
      <a class="nav-item" href="#">${icon('camera')} <span>Cámara en vivo</span></a>
      <a class="nav-item" href="#">${icon('face')} <span>Gestos y filtros</span></a>
      <a class="nav-item" href="#">${icon('challenge')} <span>Desafíos</span></a>
      <a class="nav-item" href="#">${icon('images')} <span>Mis creaciones</span></a>
    </nav>
    <div class="sidebar-bottom"><a class="nav-item" href="#">${icon('settings')} <span>Configuración</span></a><div class="profile"><span class="avatar">NV</span><span><strong>Nuevo usuario</strong><small>Plan gratuito</small></span><span class="more">•••</span></div></div>
  </aside>
  <main class="content">
    <header class="topbar"><div><p class="eyebrow">Tu espacio creativo</p><h1>Convierte tus gestos en memes.</h1></div><button class="notification" aria-label="Notificaciones">${icon('spark')}<span></span></button></header>
    <section class="hero-panel"><div class="hero-copy"><span class="pill">${icon('camera')} Visión artificial on-device</span><h2>Tu cámara. Tus gestos. Tu próximo meme.</h2><p>MemeVision reconoce tu rostro, manos y cuerpo directamente en el navegador para crear experiencias en tiempo real.</p><button class="primary-button">${icon('camera')} Abrir cámara <span>→</span></button></div><div class="hero-art" aria-hidden="true"><div class="art-ring ring-one"></div><div class="art-ring ring-two"></div><div class="art-card"><span>GESTURE</span><strong>meme<br>ready</strong><i>${icon('face')}</i></div></div></section>
    <section class="section-heading"><div><p class="eyebrow">Crea a tu manera</p><h2>Elige una experiencia</h2></div><button class="ghost-button">Ver todas <span>→</span></button></section>
    <section class="stat-grid"><article class="stat-card"><span class="stat-icon blue">${icon('face')}</span><div><small>Rostro y expresiones</small><strong>Live</strong></div><span class="stat-note">Detección facial</span></article><article class="stat-card"><span class="stat-icon yellow">${icon('challenge')}</span><div><small>Desafíos activos</small><strong>03</strong></div><span class="stat-note">Para explorar</span></article><article class="stat-card"><span class="stat-icon coral">${icon('images')}</span><div><small>Mis creaciones</small><strong id="contador-creaciones">0</strong></div><span class="stat-note" id="nota-creaciones">Aún no hay datos</span></article></section>
    <section class="empty-panel"><div class="empty-icon">${icon('camera')}</div><h2>Tu cámara es el punto de partida</h2><p>Activa una experiencia y deja que tus movimientos hagan el resto.</p><button class="secondary-button">${icon('challenge')} Explorar experiencias</button></section>
    <section class="creaciones" aria-labelledby="creaciones-title">
      <div class="creaciones-head">
        <div>
          <p class="eyebrow">Guardadas en tu dispositivo</p>
          <h2 id="creaciones-title">Mis creaciones</h2>
        </div>
        <span class="pill pill-soft" id="estado-cifrado">Cifrado inactivo</span>
      </div>
      <form id="form-creacion" class="creaciones-form">
        <input type="text" id="input-nombre" placeholder="Nombre de la creación..." required />
        <select id="input-desafio" aria-label="Desafío">
          <option value="Filtros">Filtros</option>
          <option value="Gestos">Gestos</option>
          <option value="Reto diario" selected>Reto diario</option>
        </select>
        <input type="text" id="input-nota" placeholder="Nota privada (opcional, se cifra)" />
        <button type="submit" class="primary-button">Guardar</button>
      </form>
      <div class="creaciones-seguridad">
        <input type="password" id="input-contrasena" placeholder="Contraseña para cifrar notas" />
        <button type="button" id="btn-activar-cifrado" class="secondary-button">Activar cifrado</button>
        <p id="estado-seguridad" class="estado-nota">Cifrado inactivo en esta sesión.</p>
      </div>
      <ul id="lista-creaciones" class="lista-creaciones"></ul>
    </section>
  </main>
</div>
`

// ---------------------------------------------------------------------------
// Sesión 22 — IndexedDB + Web Crypto aplicados a MemeVision: las creaciones
// viven en IndexedDB y la nota privada se cifra con una clave derivada de la
// contraseña del usuario (PBKDF2 + AES-GCM).
let db: IDBDatabase
let creaciones: Creacion[] = []
let claveSesion: CryptoKey | null = null // CryptoKey derivada de la contraseña — nunca se guarda

const listaCreacionesEl = document.querySelector<HTMLUListElement>('#lista-creaciones')!
const formCreacionEl = document.querySelector<HTMLFormElement>('#form-creacion')!
const inputNombreEl = document.querySelector<HTMLInputElement>('#input-nombre')!
const inputDesafioEl = document.querySelector<HTMLSelectElement>('#input-desafio')!
const inputNotaEl = document.querySelector<HTMLInputElement>('#input-nota')!
const inputContrasenaEl = document.querySelector<HTMLInputElement>('#input-contrasena')!
const btnActivarCifradoEl = document.querySelector<HTMLButtonElement>('#btn-activar-cifrado')!
const estadoSeguridadEl = document.querySelector<HTMLParagraphElement>('#estado-seguridad')!
const contadorEl = document.querySelector<HTMLElement>('#contador-creaciones')!
const notaContadorEl = document.querySelector<HTMLElement>('#nota-creaciones')!
const estadoCifradoEl = document.querySelector<HTMLElement>('#estado-cifrado')!

const pintarCreaciones = () => {
  listaCreacionesEl.innerHTML = ''
  if (creaciones.length === 0) {
    const vacia = document.createElement('li')
    vacia.className = 'creacion-vacia'
    vacia.textContent = 'Todavía no has guardado creaciones.'
    listaCreacionesEl.append(vacia)
    return
  }
  creaciones.forEach(creacion => {
    const li = document.createElement('li')
    li.className = 'creacion'

    const info = document.createElement('div')
    info.className = 'creacion-info'
    const nombre = document.createElement('strong')
    nombre.textContent = creacion.nombre
    const meta = document.createElement('span')
    meta.textContent = creacion.desafio + ' · ' + new Date(creacion.fecha).toLocaleDateString('es-CO')
    info.append(nombre, meta)

    const acciones = document.createElement('div')
    acciones.className = 'creacion-acciones'

    const notaEl = document.createElement('p')
    notaEl.className = 'creacion-nota oculta'

    if (creacion.notaCifrada) {
      const verNota = document.createElement('button')
      verNota.type = 'button'
      verNota.className = 'ghost-button'
      verNota.textContent = 'Ver nota'
      verNota.addEventListener('click', () => mostrarNota(creacion, notaEl))
      acciones.append(verNota)
    }

    const borrar = document.createElement('button')
    borrar.type = 'button'
    borrar.className = 'ghost-button peligro'
    borrar.textContent = 'Eliminar'
    borrar.addEventListener('click', async () => {
      await eliminarCreacion(db, creacion.id)
      await refrescar()
    })
    acciones.append(borrar)

    li.append(info, acciones, notaEl)
    listaCreacionesEl.append(li)
  })
}

const refrescar = async () => {
  creaciones = await obtenerTodasLasCreaciones(db)
  creaciones.sort((a, b) => b.fecha.localeCompare(a.fecha))
  contadorEl.textContent = String(creaciones.length)
  notaContadorEl.textContent = creaciones.length === 0 ? 'Aún no hay datos' : 'Guardadas en tu dispositivo'
  pintarCreaciones()
}

async function mostrarNota(creacion: Creacion, notaEl: HTMLElement) {
  if (notaEl.textContent) {
    notaEl.classList.toggle('oculta')
    return
  }
  if (!claveSesion) {
    estadoSeguridadEl.textContent = 'Ingresa tu contraseña y activa el cifrado para leer la nota privada.'
    inputContrasenaEl.focus()
    return
  }
  try {
    notaEl.textContent = await leerNotaPrivada(claveSesion, creacion)
    notaEl.classList.remove('oculta')
  } catch {
    notaEl.textContent = 'No se pudo descifrar: la contraseña no coincide.'
    notaEl.classList.remove('oculta')
  }
}

async function activarCifrado() {
  const contrasena = inputContrasenaEl.value
  if (contrasena.length < 6) {
    estadoSeguridadEl.textContent = 'La contraseña debe tener al menos 6 caracteres.'
    return
  }
  let sal = await obtenerConfig<Uint8Array>(db, 'sal')
  if (!sal) {
    sal = crypto.getRandomValues(new Uint8Array(16)) // la sal no es secreta: se guarda junto a los datos
    await guardarConfig(db, 'sal', sal)
  }
  claveSesion = await derivarClaveDesdeContrasena(contrasena, sal)
  inputContrasenaEl.value = ''
  estadoSeguridadEl.textContent = 'Cifrado activo para esta sesión. La contraseña no se guarda en ningún lado.'
  estadoCifradoEl.textContent = 'Cifrado activo'
}

formCreacionEl.addEventListener('submit', async (evento) => {
  evento.preventDefault()
  const nombre = inputNombreEl.value.trim()
  const nota = inputNotaEl.value.trim()
  if (!nombre) return
  if (nota && !claveSesion) {
    estadoSeguridadEl.textContent = 'Para guardar una nota privada, primero activa el cifrado con tu contraseña.'
    inputContrasenaEl.focus()
    return
  }
  const base = {
    id: crypto.randomUUID(),
    nombre,
    desafio: inputDesafioEl.value,
    fecha: new Date().toISOString(),
  }
  if (nota) {
    await guardarCreacionConNota(db, claveSesion as CryptoKey, { ...base, notaPrivada: nota })
  } else {
    await guardarCreacion(db, { ...base, notaCifrada: null, notaIv: null })
  }
  formCreacionEl.reset()
  await refrescar()
})

btnActivarCifradoEl.addEventListener('click', activarCifrado)

async function iniciar() {
  db = await abrirBaseDeDatos()
  await refrescar()
}

iniciar().catch((error) => console.error('Error al abrir IndexedDB:', error))
