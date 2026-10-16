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
import type { Creacion, Ubicacion } from './datos/db.ts'
import { derivarClaveDesdeContrasena } from './datos/cripto.ts'
import {
  estadoPermiso,
  mediaDisponible,
  abrirCamara,
  abrirFlujoConAudio,
  capturarFoto,
  detenerFlujo,
  crearMedidorDeNivel,
  obtenerUbicacion,
  describirErrorCamara,
  describirErrorUbicacion,
  grabacionDisponible,
  crearGrabadora,
} from './dispositivo.ts'

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
      <a class="nav-item" href="#" id="nav-camara">${icon('camera')} <span>Cámara en vivo</span></a>
      <a class="nav-item" href="#">${icon('face')} <span>Gestos y filtros</span></a>
      <a class="nav-item" href="#">${icon('challenge')} <span>Desafíos</span></a>
      <a class="nav-item" href="#">${icon('images')} <span>Mis creaciones</span></a>
    </nav>
    <div class="sidebar-bottom"><a class="nav-item" href="#">${icon('settings')} <span>Configuración</span></a><div class="profile"><span class="avatar">NV</span><span><strong>Nuevo usuario</strong><small>Plan gratuito</small></span><span class="more">•••</span></div></div>
  </aside>
  <main class="content">
    <header class="topbar"><div><p class="eyebrow">Tu espacio creativo</p><h1>Convierte tus gestos en memes.</h1></div><button class="notification" aria-label="Notificaciones">${icon('spark')}<span></span></button></header>
    <section class="hero-panel"><div class="hero-copy"><span class="pill">${icon('camera')} Visión artificial on-device</span><h2>Tu cámara. Tus gestos. Tu próximo meme.</h2><p>MemeVision reconoce tu rostro, manos y cuerpo directamente en el navegador para crear experiencias en tiempo real.</p><button class="primary-button" id="btn-abrir-camara">${icon('camera')} Abrir cámara <span>→</span></button></div><div class="hero-art" aria-hidden="true"><div class="art-ring ring-one"></div><div class="art-ring ring-two"></div><div class="art-card"><span>GESTURE</span><strong>meme<br>ready</strong><i>${icon('face')}</i></div></div></section>
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
        <button type="button" id="btn-foto-creacion" class="secondary-button">${icon('camera')} Foto</button>
        <button type="button" id="btn-ubicacion-creacion" class="secondary-button">📍 Ubicación</button>
        <button type="submit" class="primary-button">Guardar</button>
      </form>
      <div id="adjuntos-creacion" class="adjuntos-creacion"></div>
      <p id="adjuntos-estado" class="estado-nota"></p>
      <div class="creaciones-seguridad">
        <input type="password" id="input-contrasena" placeholder="Contraseña para cifrar notas" />
        <button type="button" id="btn-activar-cifrado" class="secondary-button">Activar cifrado</button>
        <p id="estado-seguridad" class="estado-nota">Cifrado inactivo en esta sesión.</p>
      </div>
      <ul id="lista-creaciones" class="lista-creaciones"></ul>
    </section>
  </main>
</div>

<dialog id="dlg-permiso" class="dlg-aviso">
  <h3 id="permiso-titulo">Usaremos tu cámara solo para la foto</h3>
  <p id="permiso-texto"></p>
  <div class="dlg-acciones">
    <button type="button" id="btn-permiso-continuar" class="primary-button">Continuar</button>
    <button type="button" id="btn-permiso-cancelar" class="ghost-button">Ahora no</button>
  </div>
</dialog>

<dialog id="dlg-camara" class="dlg-camara">
  <div class="camara-cab">
    <h2 id="camara-titulo">Cámara en vivo</h2>
    <button type="button" id="btn-cerrar-camara" class="ghost-button">Cerrar ✕</button>
  </div>
  <div class="modo-tabs" id="modo-tabs">
    <button type="button" id="tab-foto" class="modo-tab activo">${icon('camera')} Foto</button>
    <button type="button" id="tab-video" class="modo-tab">🎥 Vídeo</button>
  </div>
  <div class="camara-marco">
    <video id="video-camara" autoplay playsinline muted></video>
  </div>
  <p id="camara-estado" class="camara-estado"></p>
  <div id="nivel-audio" class="nivel-audio oculta"><span></span></div>
  <div class="camara-controles">
    <button type="button" id="btn-capturar" class="primary-button">${icon('camera')} Capturar</button>
    <div id="controles-video" class="controles-video oculta">
      <button type="button" id="btn-grabar" class="primary-button">● Grabar</button>
      <span id="rec-indicador" class="rec-indicador oculta"><i></i><span id="rec-tiempo">00:00</span></span>
    </div>
    <button type="button" id="btn-ubicacion-camara" class="secondary-button">📍 Ubicación</button>
  </div>
  <div id="camara-preview" class="camara-preview oculta">
    <img id="preview-img" alt="Foto capturada" />
    <video id="preview-video" class="oculta" controls playsinline></video>
    <div id="camara-preview-datos" class="camara-preview-datos">
      <input type="text" id="camara-nombre" placeholder="Nombre de la creación..." />
      <select id="camara-desafio" aria-label="Desafío">
        <option value="Filtros">Filtros</option>
        <option value="Gestos">Gestos</option>
        <option value="Reto diario" selected>Reto diario</option>
      </select>
      <span id="preview-ubicacion" class="chip-ubicacion oculta"></span>
      <button type="button" id="btn-guardar-creacion" class="primary-button">Guardar creación</button>
    </div>
  </div>
</dialog>

<dialog id="dlg-ver-video" class="dlg-ver-video">
  <div class="camara-cab">
    <h2 id="ver-video-titulo">Vídeo guardado</h2>
    <button type="button" id="btn-cerrar-ver-video" class="ghost-button">Cerrar ✕</button>
  </div>
  <video id="video-repro" controls playsinline></video>
</dialog>
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

// --- Sesión 24 — elementos de cámara, micrófono y ubicación -----------------
const navCamaraEl = document.querySelector<HTMLAnchorElement>('#nav-camara')!
const btnAbrirCamaraEl = document.querySelector<HTMLButtonElement>('#btn-abrir-camara')!
const btnFotoCreacionEl = document.querySelector<HTMLButtonElement>('#btn-foto-creacion')!
const btnUbicacionCreacionEl = document.querySelector<HTMLButtonElement>('#btn-ubicacion-creacion')!
const adjuntosCreacionEl = document.querySelector<HTMLDivElement>('#adjuntos-creacion')!
const adjuntosEstadoEl = document.querySelector<HTMLParagraphElement>('#adjuntos-estado')!

const dlgPermisoEl = document.querySelector<HTMLDialogElement>('#dlg-permiso')!
const permisoTituloEl = document.querySelector<HTMLHeadingElement>('#permiso-titulo')!
const permisoTextoEl = document.querySelector<HTMLParagraphElement>('#permiso-texto')!
const btnPermisoContinuarEl = document.querySelector<HTMLButtonElement>('#btn-permiso-continuar')!
const btnPermisoCancelarEl = document.querySelector<HTMLButtonElement>('#btn-permiso-cancelar')!

const dlgCamaraEl = document.querySelector<HTMLDialogElement>('#dlg-camara')!
const camaraTituloEl = document.querySelector<HTMLHeadingElement>('#camara-titulo')!
const videoCamaraEl = document.querySelector<HTMLVideoElement>('#video-camara')!
const camaraEstadoEl = document.querySelector<HTMLParagraphElement>('#camara-estado')!
const btnCerrarCamaraEl = document.querySelector<HTMLButtonElement>('#btn-cerrar-camara')!
const btnCapturarEl = document.querySelector<HTMLButtonElement>('#btn-capturar')!
const btnUbicacionCamaraEl = document.querySelector<HTMLButtonElement>('#btn-ubicacion-camara')!
const nivelAudioEl = document.querySelector<HTMLDivElement>('#nivel-audio')!
const nivelAudioBarraEl = document.querySelector<HTMLSpanElement>('#nivel-audio span')!
const modoTabsEl = document.querySelector<HTMLDivElement>('#modo-tabs')!
const tabFotoEl = document.querySelector<HTMLButtonElement>('#tab-foto')!
const tabVideoEl = document.querySelector<HTMLButtonElement>('#tab-video')!
const controlesVideoEl = document.querySelector<HTMLDivElement>('#controles-video')!
const btnGrabarEl = document.querySelector<HTMLButtonElement>('#btn-grabar')!
const recIndicadorEl = document.querySelector<HTMLSpanElement>('#rec-indicador')!
const recTiempoEl = document.querySelector<HTMLSpanElement>('#rec-tiempo')!
const camaraPreviewEl = document.querySelector<HTMLDivElement>('#camara-preview')!
const camaraPreviewDatosEl = document.querySelector<HTMLDivElement>('#camara-preview-datos')!
const previewImgEl = document.querySelector<HTMLImageElement>('#preview-img')!
const previewVideoEl = document.querySelector<HTMLVideoElement>('#preview-video')!
const previewUbicacionEl = document.querySelector<HTMLSpanElement>('#preview-ubicacion')!
const camaraNombreEl = document.querySelector<HTMLInputElement>('#camara-nombre')!
const camaraDesafioEl = document.querySelector<HTMLSelectElement>('#camara-desafio')!
const btnGuardarCreacionEl = document.querySelector<HTMLButtonElement>('#btn-guardar-creacion')!

const dlgVerVideoEl = document.querySelector<HTMLDialogElement>('#dlg-ver-video')!
const videoReproEl = document.querySelector<HTMLVideoElement>('#video-repro')!
const btnCerrarVerVideoEl = document.querySelector<HTMLButtonElement>('#btn-cerrar-ver-video')!

let streamActual: MediaStream | null = null
let medidor: { leer(): number; cerrar(): void } | null = null
let animacionNivel = 0
let tipoMedio: 'foto' | 'video' = 'foto' // pestaña activa: Foto o Vídeo
let modoEntrada: 'adjuntar' | 'crear' = 'crear'
let grabadora: { iniciar(): void; detener(): Promise<Blob>; estaGrabando(): boolean; destruir(): void } | null = null
let grabando = false
let temporizadorRec = 0
let segundosRec = 0
let fotoPendiente: Blob | null = null // adjunto del formulario "Mis creaciones"
let ubicacionPendiente: Ubicacion | null = null
let capturaCamara: Blob | null = null // foto o vídeo capturado en la vista "Cámara en vivo"
let ubicacionCamara: Ubicacion | null = null
let adjuntoFotoUrl: string | null = null // object URL de la miniatura del formulario
let previewUrl: string | null = null // object URL de la miniatura del diálogo
let urlVideoRepro: string | null = null // object URL del visor de vídeo
let urlsActivas: string[] = [] // object URLs de las miniaturas de la lista

const pintarCreaciones = () => {
  // Cada repintado libera los object URLs del repintado anterior: una fuga que
  // no se nota en una prueba corta y sí en una sesión de media hora (S24 §4).
  urlsActivas.forEach(url => URL.revokeObjectURL(url))
  urlsActivas = []
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

    if (creacion.video) {
      const url = URL.createObjectURL(creacion.video)
      urlsActivas.push(url)
      const miniatura = document.createElement('video')
      miniatura.className = 'miniatura'
      miniatura.src = url
      miniatura.muted = true
      miniatura.playsInline = true
      miniatura.preload = 'metadata'
      li.append(miniatura)
    } else if (creacion.foto) {
      const url = URL.createObjectURL(creacion.foto)
      urlsActivas.push(url)
      const miniatura = document.createElement('img')
      miniatura.className = 'miniatura'
      miniatura.src = url
      miniatura.alt = `Foto de ${creacion.nombre}`
      li.append(miniatura)
    }

    const info = document.createElement('div')
    info.className = 'creacion-info'
    const nombre = document.createElement('strong')
    nombre.textContent = creacion.nombre
    const meta = document.createElement('span')
    meta.textContent = creacion.desafio + ' · ' + new Date(creacion.fecha).toLocaleDateString('es-CO')
    info.append(nombre, meta)

    if (creacion.ubicacion) {
      const ubic = document.createElement('span')
      ubic.className = 'chip-ubicacion'
      ubic.textContent = `📍 ${creacion.ubicacion.lat.toFixed(4)}, ${creacion.ubicacion.lon.toFixed(4)} (±${creacion.ubicacion.precision} m)`
      info.append(ubic)
    }

    const acciones = document.createElement('div')
    acciones.className = 'creacion-acciones'

    const notaEl = document.createElement('p')
    notaEl.className = 'creacion-nota oculta'

    if (creacion.video) {
      const verVideo = document.createElement('button')
      verVideo.type = 'button'
      verVideo.className = 'ghost-button'
      verVideo.textContent = '▶ Ver'
      verVideo.addEventListener('click', () => abrirVisorVideo(creacion))
      acciones.append(verVideo)
    }

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
    foto: fotoPendiente,
    ubicacion: ubicacionPendiente,
  }
  if (nota) {
    await guardarCreacionConNota(db, claveSesion as CryptoKey, { ...base, notaPrivada: nota })
  } else {
    await guardarCreacion(db, { ...base, notaCifrada: null, notaIv: null })
  }
  formCreacionEl.reset()
  fotoPendiente = null
  ubicacionPendiente = null
  pintaAdjuntosFormulario()
  adjuntosEstadoEl.textContent = ''
  await refrescar()
})

// ---------------------------------------------------------------------------
// Sesión 24 — cámara, micrófono y ubicación aplicados a MemeVision.
// Un único <dialog> de cámara compartido y un solo flujo abierto a la vez.
function setEstadoCamara(texto: string) {
  camaraEstadoEl.textContent = texto
}

/** Miniatura + chip de los adjuntos pendientes del formulario "Mis creaciones". */
function pintaAdjuntosFormulario() {
  if (adjuntoFotoUrl) {
    URL.revokeObjectURL(adjuntoFotoUrl)
    adjuntoFotoUrl = null
  }
  adjuntosCreacionEl.innerHTML = ''
  if (fotoPendiente) {
    adjuntoFotoUrl = URL.createObjectURL(fotoPendiente)
    const img = document.createElement('img')
    img.className = 'miniatura'
    img.src = adjuntoFotoUrl
    img.alt = 'Foto adjunta'
    adjuntosCreacionEl.append(img)
  }
  if (ubicacionPendiente) {
    const chip = document.createElement('span')
    chip.className = 'chip-ubicacion'
    chip.textContent = `📍 ${ubicacionPendiente.lat.toFixed(4)}, ${ubicacionPendiente.lon.toFixed(4)} (±${ubicacionPendiente.precision} m)`
    adjuntosCreacionEl.append(chip)
  }
}

function detenerMedidor() {
  cancelAnimationFrame(animacionNivel)
  animacionNivel = 0
  medidor?.cerrar()
  medidor = null
  nivelAudioEl.classList.add('oculta')
  nivelAudioBarraEl.style.width = '0%'
}

function iniciarMedidor() {
  if (!streamActual) return
  detenerMedidor()
  medidor = crearMedidorDeNivel(streamActual)
  nivelAudioEl.classList.remove('oculta')
  const paso = () => {
    if (!medidor) return
    nivelAudioBarraEl.style.width = `${Math.round(medidor.leer() * 100)}%`
    animacionNivel = requestAnimationFrame(paso)
  }
  animacionNivel = requestAnimationFrame(paso)
}

async function iniciarStream() {
  if (!mediaDisponible()) {
    setEstadoCamara('La cámara solo funciona en HTTPS o en localhost.')
    return
  }
  try {
    streamActual = tipoMedio === 'video' ? await abrirFlujoConAudio() : await abrirCamara()
    videoCamaraEl.srcObject = streamActual
    setEstadoCamara('')
    if (tipoMedio === 'video' && streamActual.getAudioTracks().length > 0) iniciarMedidor()
    else detenerMedidor()
  } catch (err) {
    setEstadoCamara(describirErrorCamara(err))
  }
}

/** Apaga la cámara por completo: grabación, medidor, pistas y fuente del video. */
function detenerCamara() {
  detenerGrabacion()
  detenerMedidor()
  detenerFlujo(streamActual)
  streamActual = null
  videoCamaraEl.srcObject = null
}

/** Muestra los controles que corresponden al medio activo (Foto / Vídeo). */
function aplicarModo(tipo: 'foto' | 'video') {
  tipoMedio = tipo
  tabFotoEl.classList.toggle('activo', tipo === 'foto')
  tabVideoEl.classList.toggle('activo', tipo === 'video')
  btnCapturarEl.classList.toggle('oculta', tipo === 'video')
  controlesVideoEl.classList.toggle('oculta', tipo === 'foto')
  if (tipo === 'foto') nivelAudioEl.classList.add('oculta')
}

/** Cambia de Foto a Vídeo (y al revés) reabriendo el stream con el audio correcto. */
async function cambiarMedio(tipo: 'foto' | 'video') {
  if (grabando || tipo === tipoMedio) return
  aplicarModo(tipo)
  camaraPreviewEl.classList.add('oculta')
  detenerMedidor()
  detenerFlujo(streamActual)
  streamActual = null
  await iniciarStream()
  if (tipo === 'video') {
    setEstadoCamara(
      grabacionDisponible()
        ? 'Listo para grabar. Pulsa ● Grabar.'
        : 'Este navegador no puede grabar vídeo (sin MediaRecorder). Usa el modo Foto.'
    )
  }
}

function pintaTiempoRec() {
  const mm = String(Math.floor(segundosRec / 60)).padStart(2, '0')
  const ss = String(segundosRec % 60).padStart(2, '0')
  recTiempoEl.textContent = `${mm}:${ss}`
}

function iniciarGrabacion() {
  if (!streamActual || !grabacionDisponible()) return
  grabadora = crearGrabadora(streamActual)
  grabadora.iniciar()
  grabando = true
  segundosRec = 0
  pintaTiempoRec()
  recIndicadorEl.classList.remove('oculta')
  btnGrabarEl.textContent = '■ Detener'
  temporizadorRec = window.setInterval(() => {
    segundosRec++
    pintaTiempoRec()
  }, 1000)
}

function detenerGrabacion() {
  clearInterval(temporizadorRec)
  temporizadorRec = 0
  grabando = false
  recIndicadorEl.classList.add('oculta')
  btnGrabarEl.textContent = '● Grabar'
  grabadora?.destruir()
  grabadora = null
}

async function finalizarGrabacion() {
  if (!grabadora) return
  const clip = await grabadora.detener()
  detenerGrabacion()
  if (clip.size === 0) {
    setEstadoCamara('La grabación quedó vacía. Intenta de nuevo.')
    return
  }
  if (previewUrl) URL.revokeObjectURL(previewUrl)
  previewUrl = URL.createObjectURL(clip)
  previewVideoEl.src = previewUrl
  previewImgEl.classList.add('oculta')
  previewVideoEl.classList.remove('oculta')
  capturaCamara = clip
  camaraPreviewEl.classList.remove('oculta')
  setEstadoCamara('Clip grabado. Ponle nombre y guárdalo.')
}

async function abrirCamaraVista(modo: 'adjuntar' | 'crear') {
  modoEntrada = modo
  camaraTituloEl.textContent = modo === 'adjuntar' ? 'Tomar foto para la creación' : 'Cámara en vivo'
  camaraPreviewDatosEl.classList.toggle('oculta', modo !== 'crear')
  modoTabsEl.classList.toggle('oculta', modo === 'adjuntar') // al adjuntar solo aplica Foto
  camaraPreviewEl.classList.add('oculta')
  previewImgEl.classList.remove('oculta')
  previewVideoEl.classList.add('oculta')
  camaraNombreEl.value = ''
  capturaCamara = null
  ubicacionCamara = null
  aplicarModo(modo === 'adjuntar' ? 'foto' : tipoMedio)
  setEstadoCamara('')

  // El permiso se consulta SIN aviso; la cámara se pide solo tras el clic en "Continuar".
  const estado = await estadoPermiso('camera')
  if (estado === 'denied') {
    permisoTituloEl.textContent = 'Cámara bloqueada'
    permisoTextoEl.textContent =
      'Bloqueaste el permiso de cámara. Habilítalo desde el candado de la barra de direcciones para volver a usarla.'
    btnPermisoContinuarEl.classList.add('oculta')
    btnPermisoCancelarEl.textContent = 'Entendido'
  } else {
    const esVideo = tipoMedio === 'video'
    permisoTituloEl.textContent = esVideo ? 'Usaremos tu cámara y tu micrófono' : 'Usaremos tu cámara solo para la foto'
    permisoTextoEl.textContent = esVideo
      ? 'El clip se queda en tu dispositivo (IndexedDB); no se envía a ningún servidor.'
      : 'La foto y la ubicación se quedan en tu dispositivo (IndexedDB); no se envían a ningún servidor.'
    btnPermisoContinuarEl.classList.remove('oculta')
    btnPermisoCancelarEl.textContent = 'Ahora no'
  }
  dlgPermisoEl.showModal()
}

navCamaraEl.addEventListener('click', evento => {
  evento.preventDefault()
  void abrirCamaraVista('crear')
})
btnAbrirCamaraEl.addEventListener('click', () => void abrirCamaraVista('crear'))

btnPermisoContinuarEl.addEventListener('click', async () => {
  dlgPermisoEl.close()
  if (!dlgCamaraEl.open) dlgCamaraEl.showModal()
  await iniciarStream()
  if (tipoMedio === 'video') {
    setEstadoCamara(
      grabacionDisponible()
        ? 'Listo para grabar. Pulsa ● Grabar.'
        : 'Este navegador no puede grabar vídeo (sin MediaRecorder). Usa el modo Foto.'
    )
  }
})
btnPermisoCancelarEl.addEventListener('click', () => dlgPermisoEl.close())
btnCerrarCamaraEl.addEventListener('click', () => dlgCamaraEl.close())

tabFotoEl.addEventListener('click', () => void cambiarMedio('foto'))
tabVideoEl.addEventListener('click', () => void cambiarMedio('video'))

// Al cerrar el diálogo —incluido con la tecla Esc— el hardware se libera siempre.
dlgCamaraEl.addEventListener('close', () => {
  detenerCamara()
  camaraPreviewEl.classList.add('oculta')
  previewUbicacionEl.classList.add('oculta')
  previewVideoEl.classList.add('oculta')
  previewImgEl.classList.remove('oculta')
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
    previewUrl = null
  }
  capturaCamara = null
  ubicacionCamara = null
  setEstadoCamara('')
})

btnCapturarEl.addEventListener('click', async () => {
  if (!streamActual) return
  try {
    const blob = await capturarFoto(videoCamaraEl)
    if (modoEntrada === 'adjuntar') {
      fotoPendiente = blob
      pintaAdjuntosFormulario()
      adjuntosEstadoEl.textContent = 'Foto adjunta. Pulsa Guardar para crear la creación.'
      dlgCamaraEl.close()
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrl = URL.createObjectURL(blob)
    previewImgEl.src = previewUrl
    previewVideoEl.classList.add('oculta')
    previewImgEl.classList.remove('oculta')
    capturaCamara = blob
    camaraPreviewEl.classList.remove('oculta')
    setEstadoCamara('Foto capturada. Ponle nombre y guárdala.')
  } catch (err) {
    setEstadoCamara(describirErrorCamara(err))
  }
})

btnGrabarEl.addEventListener('click', async () => {
  if (grabando) await finalizarGrabacion()
  else if (!grabacionDisponible()) setEstadoCamara('Este navegador no puede grabar vídeo (sin MediaRecorder).')
  else iniciarGrabacion()
})

btnUbicacionCamaraEl.addEventListener('click', async () => {
  try {
    const ubic = await obtenerUbicacion()
    if (modoEntrada === 'adjuntar') {
      ubicacionPendiente = ubic
      pintaAdjuntosFormulario()
      adjuntosEstadoEl.textContent = `Ubicación adjunta: ${ubic.lat.toFixed(4)}, ${ubic.lon.toFixed(4)} (±${ubic.precision} m).`
    } else {
      ubicacionCamara = ubic
      previewUbicacionEl.textContent = `📍 ${ubic.lat.toFixed(4)}, ${ubic.lon.toFixed(4)} (±${ubic.precision} m)`
      previewUbicacionEl.classList.remove('oculta')
    }
    setEstadoCamara(`Ubicación: ${ubic.lat.toFixed(4)}, ${ubic.lon.toFixed(4)} (±${ubic.precision} m)`)
  } catch (err) {
    setEstadoCamara(describirErrorUbicacion(err))
  }
})

btnGuardarCreacionEl.addEventListener('click', async () => {
  if (!capturaCamara) {
    setEstadoCamara(tipoMedio === 'video' ? 'Primero graba un clip.' : 'Primero captura una foto.')
    return
  }
  const nombre = camaraNombreEl.value.trim()
  if (!nombre) {
    setEstadoCamara('Ponle un nombre a la creación.')
    camaraNombreEl.focus()
    return
  }
  const esVideo = tipoMedio === 'video'
  await guardarCreacion(db, {
    id: crypto.randomUUID(),
    nombre,
    desafio: camaraDesafioEl.value,
    fecha: new Date().toISOString(),
    notaCifrada: null,
    notaIv: null,
    foto: esVideo ? null : capturaCamara,
    ubicacion: ubicacionCamara,
    video: esVideo ? capturaCamara : null,
  })
  camaraNombreEl.value = ''
  dlgCamaraEl.close()
  await refrescar()
})

/** Reproductor del clip guardado (el object URL se libera al cerrar). */
function abrirVisorVideo(creacion: Creacion) {
  if (!creacion.video) return
  if (urlVideoRepro) URL.revokeObjectURL(urlVideoRepro)
  urlVideoRepro = URL.createObjectURL(creacion.video)
  videoReproEl.src = urlVideoRepro
  dlgVerVideoEl.showModal()
}
btnCerrarVerVideoEl.addEventListener('click', () => dlgVerVideoEl.close())
dlgVerVideoEl.addEventListener('close', () => {
  videoReproEl.pause()
  videoReproEl.removeAttribute('src')
  if (urlVideoRepro) {
    URL.revokeObjectURL(urlVideoRepro)
    urlVideoRepro = null
  }
})

btnFotoCreacionEl.addEventListener('click', () => void abrirCamaraVista('adjuntar'))
btnUbicacionCreacionEl.addEventListener('click', async () => {
  try {
    ubicacionPendiente = await obtenerUbicacion()
    pintaAdjuntosFormulario()
    adjuntosEstadoEl.textContent = `Ubicación adjunta: ${ubicacionPendiente.lat.toFixed(4)}, ${ubicacionPendiente.lon.toFixed(4)} (±${ubicacionPendiente.precision} m).`
  } catch (err) {
    adjuntosEstadoEl.textContent = describirErrorUbicacion(err)
  }
})

btnActivarCifradoEl.addEventListener('click', activarCifrado)

async function iniciar() {
  db = await abrirBaseDeDatos()
  await refrescar()
}

iniciar().catch((error) => console.error('Error al abrir IndexedDB:', error))
