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
import { cifrarTexto, derivarClaveDesdeContrasena, descifrarTexto } from './datos/cripto.ts'
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
  contarCamaras,
} from './dispositivo.ts'
import { GESTOS } from './vision/tipos.ts'
import { urlMeme } from './vision/memes.ts'
import { estadoModelosOffline, prepararModelosOffline } from './vision/offline.ts'
import { montarGestos } from './vision/ui-gestos.ts'

type EventoInstalacion = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type Verificador = { cifrado: ArrayBuffer; iv: Uint8Array }

const MAX_SEGUNDOS_VIDEO = 30
const MAX_BYTES_VIDEO = 40 * 1024 * 1024
const TEXTO_VERIFICADOR = 'memevision-v1'

let db: IDBDatabase
let creaciones: Creacion[] = []
let claveSesion: CryptoKey | null = null
let eventoInstalacion: EventoInstalacion | null = null
let actualizacionDisponible = false
let actualizarSW: ((reloadPage?: boolean) => Promise<void>) | null = null

const qs = <T extends Element>(selector: string): T => {
  const elemento = document.querySelector<T>(selector)
  if (!elemento) throw new Error(`No se encontró el elemento ${selector}.`)
  return elemento
}

const icon = (name: string) => {
  const paths: Record<string, string> = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    upload: '<path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M5 20h14"/>',
    images: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m4 17 4-4 3 3 2-2 4 3"/>',
    camera: '<path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"/><circle cx="12" cy="12.5" r="3.5"/>',
    hand: '<path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M11 10V4.5a1.5 1.5 0 0 1 3 0V10"/><path d="M14 10V6a1.5 1.5 0 0 1 3 0v6.5a6.5 6.5 0 0 1-13 0V9a1.5 1.5 0 0 1 3 0v3"/>',
    download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 21h14"/>',
    install: '<path d="M12 3v11m0 0 4-4m-4 4-4-4"/><path d="M4 16v4h16v-4"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5.5 5.5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/>',
    offline: '<path d="m3 3 18 18"/><path d="M5 12.5a10 10 0 0 1 6.2-2.8"/><path d="M15.5 10.4A10 10 0 0 1 19 12.5"/><path d="M8.5 16a5.5 5.5 0 0 1 4-1.5"/><circle cx="12" cy="19" r="1"/>',
    shield: '<path d="M12 3 5 6v5c0 4.4 2.9 8.3 7 9.8 4.1-1.5 7-5.4 7-9.8V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    spark: '<path d="m12 3 1.3 5.7L19 10l-5.7 1.3L12 17l-1.3-5.7L5 10l5.7-1.3L12 3Z"/><path d="m19 3 .4 1.6L21 5l-1.6.4L19 7l-.4-1.6L17 5l1.6-.4L19 3Z"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    trash: '<path d="M4 7h16"/><path d="m9 7 .7-2h4.6L15 7"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v5M14 11v5"/>',
    pin: '<path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
  }
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] ?? ''}</svg>`
}

const app = qs<HTMLDivElement>('#app')
app.innerHTML = `
<div class="app-shell">
  <header class="site-header">
    <a class="brand" href="#inicio" aria-label="gestIA, ir al inicio">
      <span class="brand-mark">${icon('spark')}</span>
      <span class="brand-name">gest<span>IA</span></span>
    </a>
    <div class="header-actions">
      <span id="conexion-estado" class="conexion" role="status" aria-live="polite">En línea</span>
      <button id="btn-instalar" class="button button-ghost button-small" type="button" hidden>${icon('install')} Instalar app</button>
      <button id="btn-actualizar" class="button button-ghost button-small" type="button" hidden>Actualizar</button>
    </div>
  </header>

  <main id="inicio">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="kicker"><span aria-hidden="true"></span> Visión artificial en tu navegador</p>
        <p class="slogan">Intelligence meets gesture.</p>
        <h1 id="hero-title">Haz un gesto.<br />Te devolvemos un meme.</h1>
        <p class="lede">gestIA reconoce 14 gestos con la cámara y los convierte en memes. El video se queda en tu dispositivo: sin cuentas, sin servidores, sin subidas.</p>
        <div class="hero-actions">
          <button id="btn-abrir-camara" class="button button-primary" type="button">${icon('camera')} Abrir cámara</button>
          <button class="button button-secondary" type="button" data-abrir-gestos>${icon('hand')} Probar gestos</button>
        </div>
        <p class="hero-facts"><span>14 gestos</span><span>Modelo local</span><span>Sin cuenta</span></p>
      </div>
      <div class="hero-stage">
        <div class="viewfinder">
          <div class="viewfinder-top"><span class="rec"><i></i> demo</span><span>on-device</span></div>
          <img id="hero-meme" src="" alt="Meme de ejemplo: pulgar arriba" />
          <span class="corner corner-tl" aria-hidden="true"></span>
          <span class="corner corner-tr" aria-hidden="true"></span>
          <span class="corner corner-bl" aria-hidden="true"></span>
          <span class="corner corner-br" aria-hidden="true"></span>
          <div class="viewfinder-caption"><span>gesture / like</span><strong aria-hidden="true">👍</strong></div>
        </div>
        <span class="sticker sticker-like" aria-hidden="true">👍 like</span>
        <p class="hero-privacy">${icon('shield')} Tu cámara no sale del navegador.</p>
      </div>
    </section>

    <section class="steps-section" aria-labelledby="pasos-title">
      <div class="section-head">
        <p class="kicker">Cómo funciona</p>
        <h2 id="pasos-title">Tres pasos. Cero fricción.</h2>
      </div>
      <ol class="steps">
        <li>
          <span class="step-num">01</span>
          <h3>Activa la cámara</h3>
          <p>Permite el acceso solo cuando pulses el botón. Puedes cerrar la vista en cualquier momento y la cámara se apaga.</p>
        </li>
        <li>
          <span class="step-num">02</span>
          <h3>Haz tu gesto</h3>
          <p>El modelo reconoce la mano y el rostro en el navegador. Cuando mantienes el gesto, aparece su meme.</p>
        </li>
        <li>
          <span class="step-num">03</span>
          <h3>Guarda tu creación</h3>
          <p>Las fotos, videos y notas se guardan en IndexedDB. La nota privada se cifra con tu contraseña.</p>
        </li>
      </ol>
    </section>

    <section class="gestures-section" aria-labelledby="gestos-title">
      <div class="section-head section-head-split">
        <div>
          <p class="kicker">Catálogo real</p>
          <h2 id="gestos-title">Catorce gestos, catorce memes.</h2>
          <p class="section-lede">Este es el catálogo que reconoce el modelo actual. Toca uno para abrir la vista de gestos.</p>
        </div>
        <button class="button button-secondary" type="button" data-abrir-gestos>${icon('hand')} Probar ahora</button>
      </div>
      <div id="lista-gestos" class="gesture-grid"></div>

      <div class="offline-panel">
        <span class="offline-icon">${icon('download')}</span>
        <div class="offline-copy">
          <h3>Preparar para usar sin conexión</h3>
          <p>Descarga las tareas de MediaPipe y el WASM una sola vez (unos 27 MB). Después el reconocimiento funciona sin red.</p>
          <p id="offline-estado" class="status-line" role="status" aria-live="polite">Comprobando modelos…</p>
          <progress id="offline-progreso" class="progress" max="3" value="0" hidden></progress>
        </div>
        <button id="btn-preparar-offline" class="button button-ghost" type="button">Preparar sin conexión</button>
      </div>
    </section>

    <section class="creations-section" aria-labelledby="creaciones-title">
      <div class="section-head section-head-split">
        <div>
          <p class="kicker">Tu archivo local</p>
          <h2 id="creaciones-title">Mis creaciones</h2>
          <p class="section-lede">Tus fotos, videos y notas viven en este dispositivo. Nada se envía a un servidor.</p>
        </div>
        <span class="count-pill"><strong id="contador-creaciones">0</strong> guardadas</span>
      </div>

      <div class="creation-workspace">
        <form id="form-creacion" class="creation-form">
          <div class="field">
            <label for="input-nombre">Nombre</label>
            <input type="text" id="input-nombre" placeholder="Ej. Mi cara de lunes" maxlength="80" required />
          </div>
          <div class="field">
            <label for="input-desafio">Tipo</label>
            <select id="input-desafio">
              <option value="Reto diario" selected>Reto diario</option>
              <option value="Gesto">Gesto</option>
              <option value="Espontáneo">Espontáneo</option>
            </select>
          </div>
          <div class="field field-full">
            <label for="input-nota">Nota privada <span>(opcional, se cifra)</span></label>
            <textarea id="input-nota" rows="3" placeholder="¿Qué pasó cuando hiciste este gesto?"></textarea>
          </div>
          <div class="form-actions">
            <button type="button" id="btn-foto-creacion" class="button button-secondary">${icon('camera')} Añadir foto</button>
            <button type="button" id="btn-ubicacion-creacion" class="button button-secondary">${icon('pin')} Añadir ubicación</button>
            <button type="submit" class="button button-primary">Guardar creación</button>
          </div>
          <p id="adjuntos-estado" class="status-line" role="status" aria-live="polite"></p>
          <div id="adjuntos-creacion" class="adjuntos-creacion"></div>
        </form>

        <aside class="security-card" aria-labelledby="security-title">
          <div class="security-head">
            <h3 id="security-title">Nota privada</h3>
            <span id="estado-cifrado" class="chip">Cifrado inactivo</span>
          </div>
          <p>La nota se cifra con AES-GCM y una clave derivada de tu contraseña. La contraseña nunca se guarda.</p>
          <div class="field">
            <label for="input-contrasena">Contraseña</label>
            <input type="password" id="input-contrasena" autocomplete="new-password" minlength="8" placeholder="Mínimo 8 caracteres" />
          </div>
          <div class="field">
            <label for="input-contrasena-confirm">Confirmar contraseña</label>
            <input type="password" id="input-contrasena-confirm" autocomplete="new-password" minlength="8" placeholder="Repite la contraseña" />
          </div>
          <button type="button" id="btn-activar-cifrado" class="button button-secondary">${icon('lock')} Activar cifrado</button>
          <p id="estado-seguridad" class="status-line" role="status" aria-live="polite">Cifrado inactivo en esta sesión.</p>
          <p class="security-note">${icon('shield')} Si olvidas la contraseña, no se puede recuperar la nota.</p>
        </aside>
      </div>

      <div class="creation-list-head">
        <h3>Tus archivos</h3>
        <p id="nota-creaciones" class="status-line">Aún no hay datos</p>
      </div>
      <ul id="lista-creaciones" class="creation-grid" aria-label="Creaciones guardadas"></ul>
    </section>
  </main>

  <footer class="site-footer">
    <p><strong>gestIA</strong> convierte gestos en memes sin sacar el video de tu dispositivo.</p>
    <p class="footer-small">Hecho para la Electiva PWA · Funciona sin conexión después de preparar los modelos.</p>
    <p id="instalar-ayuda" class="footer-small" hidden>En iPhone o iPad: toca Compartir y luego “Añadir a pantalla de inicio”.</p>
  </footer>
</div>

<p id="app-alerta" class="app-alert" role="alert" hidden></p>
<div id="toast" class="toast" role="status" aria-live="polite" hidden></div>

<dialog id="dlg-permiso" class="dialog dialog-small" aria-labelledby="permiso-titulo" aria-describedby="permiso-texto">
  <h3 id="permiso-titulo">Usaremos tu cámara solo para la foto</h3>
  <p id="permiso-texto"></p>
  <div class="dialog-actions">
    <button type="button" id="btn-permiso-continuar" class="button button-primary">Continuar</button>
    <button type="button" id="btn-permiso-cancelar" class="button button-ghost">Ahora no</button>
  </div>
</dialog>

<dialog id="dlg-camara" class="dialog dialog-camera" aria-labelledby="camara-titulo" aria-describedby="camara-estado">
  <div class="dialog-head">
    <h2 id="camara-titulo">Cámara en vivo</h2>
    <button type="button" id="btn-cerrar-camara" class="button button-ghost button-small" aria-label="Cerrar cámara">${icon('close')}</button>
  </div>
  <div class="mode-tabs" id="modo-tabs" role="tablist" aria-label="Modo de captura">
    <button type="button" id="tab-foto" class="mode-tab is-active" role="tab" aria-selected="true">${icon('camera')} Foto</button>
    <button type="button" id="tab-video" class="mode-tab" role="tab" aria-selected="false">▶ Vídeo</button>
  </div>
  <div class="camera-frame">
    <video id="video-camara" autoplay playsinline muted aria-label="Vista de la cámara"></video>
  </div>
  <p id="camara-estado" class="status-line" role="status" aria-live="polite"></p>
  <div id="nivel-audio" class="audio-meter is-hidden"><span></span></div>
  <div class="camera-controls">
    <button type="button" id="btn-capturar" class="button button-primary">${icon('camera')} Capturar</button>
    <div id="controles-video" class="video-controls is-hidden">
      <button type="button" id="btn-grabar" class="button button-primary">● Grabar</button>
      <span id="rec-indicador" class="rec-indicator is-hidden"><i></i><span id="rec-tiempo">00:00</span></span>
    </div>
    <button type="button" id="btn-ubicacion-camara" class="button button-secondary">${icon('pin')} Ubicación</button>
    <button type="button" id="btn-cambiar-camara" class="button button-secondary is-hidden">⇄ Cambiar cámara</button>
  </div>
  <div id="camara-preview" class="camera-preview is-hidden">
    <img id="preview-img" alt="Foto capturada" />
    <video id="preview-video" class="is-hidden" controls playsinline aria-label="Vista previa del video grabado"></video>
    <div id="camara-preview-datos" class="camera-preview-data">
      <label for="camara-nombre">Nombre de la creación</label>
      <input type="text" id="camara-nombre" maxlength="80" placeholder="Ponle un nombre" />
      <label for="camara-desafio">Tipo</label>
      <select id="camara-desafio">
        <option value="Reto diario" selected>Reto diario</option>
        <option value="Gesto">Gesto</option>
        <option value="Espontáneo">Espontáneo</option>
      </select>
      <span id="preview-ubicacion" class="chip is-hidden"></span>
      <button type="button" id="btn-guardar-creacion" class="button button-primary">Guardar creación</button>
    </div>
  </div>
  <p class="dialog-note">Máximo ${MAX_SEGUNDOS_VIDEO} s de video. El clip se guarda en tu dispositivo.</p>
</dialog>

<dialog id="dlg-ver-video" class="dialog dialog-viewer" aria-labelledby="ver-video-titulo">
  <div class="dialog-head">
    <h2 id="ver-video-titulo">Vídeo guardado</h2>
    <button type="button" id="btn-cerrar-ver-video" class="button button-ghost button-small" aria-label="Cerrar visor">${icon('close')}</button>
  </div>
  <img id="imagen-repro" class="is-hidden" alt="Foto guardada" />
  <video id="video-repro" class="is-hidden" controls playsinline aria-label="Video guardado"></video>
</dialog>

<dialog id="dlg-gestos" class="dialog dialog-gestures" aria-labelledby="gestos-dialog-titulo">
  <div class="dialog-head">
    <h2 id="gestos-dialog-titulo">Gestos en vivo</h2>
    <button type="button" id="btn-cerrar-gestos" class="button button-ghost button-small" aria-label="Cerrar gestos">${icon('close')}</button>
  </div>
  <div class="gestures-layout">
    <div class="gestures-video-wrap is-mirror" id="gestos-video-wrap">
      <video id="video-gestos" autoplay playsinline muted aria-label="Vista de la cámara para reconocer gestos"></video>
      <canvas id="lienzo-gestos" aria-hidden="true"></canvas>
      <div id="gestos-placeholder" class="gestures-placeholder">
        <span class="gestures-placeholder-icon">${icon('camera')}</span>
        <strong>La cámara está apagada</strong>
        <span>Pulsa «Activar cámara» para empezar.</span>
      </div>
      <span class="gestures-chip" id="gestos-motor">Motor: —</span>
    </div>
    <aside class="gestures-panel">
      <div class="gesture-meme-frame">
        <img id="meme-gestos" alt="Meme del gesto reconocido" />
      </div>
      <p class="gesture-label" id="gesto-etiqueta">Esperando gesto…</p>
      <div class="confidence" aria-hidden="true"><span id="gesto-confianza"></span></div>
      <p class="status-line" id="gestos-estado" role="status" aria-live="polite">Pulsa «Activar cámara» para empezar.</p>
      <div class="gesture-actions">
        <button type="button" id="btn-iniciar-gestos" class="button button-primary">Activar cámara</button>
        <button type="button" id="btn-cambiar-gestos" class="button button-secondary is-hidden">⇄ Cambiar cámara</button>
        <button type="button" id="btn-debug-gestos" class="button button-ghost button-small" aria-pressed="false">Puntos</button>
      </div>
      <p class="gesture-hint">El gesto se mantiene unos instantes antes de cambiar el meme. Cierra la vista para apagar la cámara.</p>
    </aside>
  </div>
</dialog>
`

// ---------------------------------------------------------------------------
// Referencias del DOM
const conexionEl = qs<HTMLSpanElement>('#conexion-estado')
const btnInstalarEl = qs<HTMLButtonElement>('#btn-instalar')
const btnActualizarEl = qs<HTMLButtonElement>('#btn-actualizar')
const instalarAyudaEl = qs<HTMLParagraphElement>('#instalar-ayuda')
const appAlertaEl = qs<HTMLParagraphElement>('#app-alerta')
const toastEl = qs<HTMLDivElement>('#toast')

const btnAbrirCamaraEl = qs<HTMLButtonElement>('#btn-abrir-camara')
const listaGestosEl = qs<HTMLDivElement>('#lista-gestos')
const heroMemeEl = qs<HTMLImageElement>('#hero-meme')
const btnPrepararOfflineEl = qs<HTMLButtonElement>('#btn-preparar-offline')
const offlineEstadoEl = qs<HTMLParagraphElement>('#offline-estado')
const offlineProgresoEl = qs<HTMLProgressElement>('#offline-progreso')

const listaCreacionesEl = qs<HTMLUListElement>('#lista-creaciones')
const formCreacionEl = qs<HTMLFormElement>('#form-creacion')
const inputNombreEl = qs<HTMLInputElement>('#input-nombre')
const inputDesafioEl = qs<HTMLSelectElement>('#input-desafio')
const inputNotaEl = qs<HTMLTextAreaElement>('#input-nota')
const inputContrasenaEl = qs<HTMLInputElement>('#input-contrasena')
const inputContrasenaConfirmEl = qs<HTMLInputElement>('#input-contrasena-confirm')
const btnActivarCifradoEl = qs<HTMLButtonElement>('#btn-activar-cifrado')
const estadoSeguridadEl = qs<HTMLParagraphElement>('#estado-seguridad')
const contadorEl = qs<HTMLElement>('#contador-creaciones')
const notaContadorEl = qs<HTMLParagraphElement>('#nota-creaciones')
const estadoCifradoEl = qs<HTMLElement>('#estado-cifrado')
const btnFotoCreacionEl = qs<HTMLButtonElement>('#btn-foto-creacion')
const btnUbicacionCreacionEl = qs<HTMLButtonElement>('#btn-ubicacion-creacion')
const adjuntosCreacionEl = qs<HTMLDivElement>('#adjuntos-creacion')
const adjuntosEstadoEl = qs<HTMLParagraphElement>('#adjuntos-estado')

const dlgPermisoEl = qs<HTMLDialogElement>('#dlg-permiso')
const permisoTituloEl = qs<HTMLHeadingElement>('#permiso-titulo')
const permisoTextoEl = qs<HTMLParagraphElement>('#permiso-texto')
const btnPermisoContinuarEl = qs<HTMLButtonElement>('#btn-permiso-continuar')
const btnPermisoCancelarEl = qs<HTMLButtonElement>('#btn-permiso-cancelar')

const dlgCamaraEl = qs<HTMLDialogElement>('#dlg-camara')
const camaraTituloEl = qs<HTMLHeadingElement>('#camara-titulo')
const videoCamaraEl = qs<HTMLVideoElement>('#video-camara')
const camaraEstadoEl = qs<HTMLParagraphElement>('#camara-estado')
const btnCerrarCamaraEl = qs<HTMLButtonElement>('#btn-cerrar-camara')
const btnCapturarEl = qs<HTMLButtonElement>('#btn-capturar')
const btnUbicacionCamaraEl = qs<HTMLButtonElement>('#btn-ubicacion-camara')
const btnCambiarCamaraEl = qs<HTMLButtonElement>('#btn-cambiar-camara')
const nivelAudioEl = qs<HTMLDivElement>('#nivel-audio')
const nivelAudioBarraEl = qs<HTMLSpanElement>('#nivel-audio span')
const modoTabsEl = qs<HTMLDivElement>('#modo-tabs')
const tabFotoEl = qs<HTMLButtonElement>('#tab-foto')
const tabVideoEl = qs<HTMLButtonElement>('#tab-video')
const controlesVideoEl = qs<HTMLDivElement>('#controles-video')
const btnGrabarEl = qs<HTMLButtonElement>('#btn-grabar')
const recIndicadorEl = qs<HTMLSpanElement>('#rec-indicador')
const recTiempoEl = qs<HTMLSpanElement>('#rec-tiempo')
const camaraPreviewEl = qs<HTMLDivElement>('#camara-preview')
const camaraPreviewDatosEl = qs<HTMLDivElement>('#camara-preview-datos')
const previewImgEl = qs<HTMLImageElement>('#preview-img')
const previewVideoEl = qs<HTMLVideoElement>('#preview-video')
const previewUbicacionEl = qs<HTMLSpanElement>('#preview-ubicacion')
const camaraNombreEl = qs<HTMLInputElement>('#camara-nombre')
const camaraDesafioEl = qs<HTMLSelectElement>('#camara-desafio')
const btnGuardarCreacionEl = qs<HTMLButtonElement>('#btn-guardar-creacion')

const dlgVerVideoEl = qs<HTMLDialogElement>('#dlg-ver-video')
const videoReproEl = qs<HTMLVideoElement>('#video-repro')
const imagenReproEl = qs<HTMLImageElement>('#imagen-repro')
const verVisorTituloEl = qs<HTMLHeadingElement>('#ver-video-titulo')
const btnCerrarVerVideoEl = qs<HTMLButtonElement>('#btn-cerrar-ver-video')

// ---------------------------------------------------------------------------
// Estado de UI
let streamActual: MediaStream | null = null
let medidor: { leer(): number; cerrar(): void } | null = null
let animacionNivel = 0
let tipoMedio: 'foto' | 'video' = 'foto'
let modoEntrada: 'adjuntar' | 'crear' = 'crear'
let facingMode: 'user' | 'environment' = 'environment'
let grabadora: { iniciar(): void; detener(): Promise<Blob>; estaGrabando(): boolean; destruir(): void } | null = null
let grabando = false
let temporizadorRec = 0
let segundosRec = 0
let fotoPendiente: Blob | null = null
let ubicacionPendiente: Ubicacion | null = null
let capturaCamara: Blob | null = null
let ubicacionCamara: Ubicacion | null = null
let adjuntoFotoUrl: string | null = null
let previewUrl: string | null = null
let urlVisor: string | null = null
let urlsActivas: string[] = []

// ---------------------------------------------------------------------------
// Utilidades de UI
function mostrarToast(texto: string): void {
  toastEl.textContent = texto
  toastEl.hidden = false
  window.clearTimeout(Number(toastEl.dataset.temporizador ?? 0))
  const temporizador = window.setTimeout(() => {
    toastEl.hidden = true
  }, 4200)
  toastEl.dataset.temporizador = String(temporizador)
}

function mostrarAlerta(texto: string): void {
  appAlertaEl.textContent = texto
  appAlertaEl.hidden = false
}

function ocultarAlerta(): void {
  appAlertaEl.hidden = true
  appAlertaEl.textContent = ''
}

function actualizarConexion(): void {
  const enLinea = navigator.onLine
  conexionEl.textContent = enLinea ? 'En línea' : 'Sin conexión'
  conexionEl.classList.toggle('is-offline', !enLinea)
  conexionEl.setAttribute('aria-label', enLinea ? 'Conexión a internet disponible' : 'Sin conexión a internet')
}

function actualizarBotonActualizar(): void {
  btnActualizarEl.hidden = !actualizacionDisponible
}

function estaInstalada(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function esIOS(): boolean {
  const ua = navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function pintarInstalacion(): void {
  if (estaInstalada()) {
    btnInstalarEl.hidden = true
    instalarAyudaEl.hidden = true
    return
  }
  btnInstalarEl.hidden = !eventoInstalacion
  instalarAyudaEl.hidden = !(esIOS() && !eventoInstalacion)
}

async function pedirInstalacion(): Promise<void> {
  if (!eventoInstalacion) return
  const evento = eventoInstalacion
  eventoInstalacion = null
  btnInstalarEl.hidden = true
  await evento.prompt()
  const eleccion = await evento.userChoice
  if (eleccion.outcome === 'accepted') {
    mostrarToast('Instalación aceptada. Abre gestIA desde su icono.')
  } else {
    mostrarToast('Instalación cancelada. Puedes intentarlo desde el menú del navegador.')
  }
  pintarInstalacion()
}

function pintarGestos(): void {
  listaGestosEl.innerHTML = ''
  for (const [id, config] of Object.entries(GESTOS)) {
    if (id === 'ninguno') continue
    const boton = document.createElement('button')
    boton.type = 'button'
    boton.className = 'gesture-card'
    boton.setAttribute('aria-label', `Probar el gesto ${config.etiqueta}`)
    boton.dataset.gesto = id

    const imagen = document.createElement('img')
    imagen.src = urlMeme(id as keyof typeof GESTOS, 0)
    imagen.alt = `Meme del gesto ${config.etiqueta}`
    imagen.loading = 'lazy'
    imagen.decoding = 'async'

    const emoji = document.createElement('span')
    emoji.className = 'gesture-emoji'
    emoji.textContent = config.emoji
    emoji.setAttribute('aria-hidden', 'true')

    const etiqueta = document.createElement('span')
    etiqueta.className = 'gesture-card-label'
    etiqueta.textContent = config.etiqueta

    boton.append(imagen, emoji, etiqueta)
    boton.addEventListener('click', () => void gestos.abrir())
    listaGestosEl.append(boton)
  }
}

// ---------------------------------------------------------------------------
// Creaciones
const pintarCreaciones = () => {
  urlsActivas.forEach(url => URL.revokeObjectURL(url))
  urlsActivas = []
  listaCreacionesEl.innerHTML = ''

  if (creaciones.length === 0) {
    const vacia = document.createElement('li')
    vacia.className = 'creation-empty'
    vacia.textContent = 'Todavía no has guardado creaciones. Abre la cámara o prepara un gesto para empezar.'
    listaCreacionesEl.append(vacia)
    return
  }

  creaciones.forEach(creacion => {
    const li = document.createElement('li')
    li.className = 'creation'

    if (creacion.video) {
      const url = URL.createObjectURL(creacion.video)
      urlsActivas.push(url)
      const miniatura = document.createElement('video')
      miniatura.className = 'creation-thumb'
      miniatura.src = url
      miniatura.muted = true
      miniatura.playsInline = true
      miniatura.preload = 'metadata'
      miniatura.setAttribute('aria-label', `Video de ${creacion.nombre}`)
      li.append(miniatura)
    } else if (creacion.foto) {
      const url = URL.createObjectURL(creacion.foto)
      urlsActivas.push(url)
      const miniatura = document.createElement('img')
      miniatura.className = 'creation-thumb'
      miniatura.src = url
      miniatura.alt = `Foto de ${creacion.nombre}`
      miniatura.loading = 'lazy'
      li.append(miniatura)
    }

    const info = document.createElement('div')
    info.className = 'creation-info'
    const nombre = document.createElement('strong')
    nombre.textContent = creacion.nombre
    const meta = document.createElement('span')
    const fecha = new Date(creacion.fecha)
    const fechaTexto = Number.isNaN(fecha.getTime()) ? 'Fecha desconocida' : fecha.toLocaleDateString('es-CO')
    meta.textContent = `${creacion.desafio} · ${fechaTexto}`
    info.append(nombre, meta)

    if (creacion.ubicacion) {
      const ubicacion = document.createElement('span')
      ubicacion.className = 'chip'
      ubicacion.textContent = `📍 ${creacion.ubicacion.lat.toFixed(4)}, ${creacion.ubicacion.lon.toFixed(4)} (±${creacion.ubicacion.precision} m)`
      info.append(ubicacion)
    }

    const acciones = document.createElement('div')
    acciones.className = 'creation-actions'
    const notaEl = document.createElement('p')
    notaEl.className = 'creation-note is-hidden'

    if (creacion.video || creacion.foto) {
      const ver = document.createElement('button')
      ver.type = 'button'
      ver.className = 'button button-ghost button-small'
      ver.textContent = creacion.video ? 'Ver video' : 'Ver foto'
      ver.setAttribute('aria-label', `Abrir ${creacion.video ? 'video' : 'foto'} de ${creacion.nombre}`)
      ver.addEventListener('click', () => abrirVisor(creacion))
      acciones.append(ver)
    }

    if (creacion.notaCifrada) {
      const verNota = document.createElement('button')
      verNota.type = 'button'
      verNota.className = 'button button-ghost button-small'
      verNota.textContent = 'Ver nota'
      verNota.setAttribute('aria-label', `Ver nota privada de ${creacion.nombre}`)
      verNota.addEventListener('click', () => void mostrarNota(creacion, notaEl))
      acciones.append(verNota)
    }

    const borrar = document.createElement('button')
    borrar.type = 'button'
    borrar.className = 'button button-ghost button-small button-danger'
    borrar.textContent = 'Eliminar'
    borrar.setAttribute('aria-label', `Eliminar ${creacion.nombre}`)
    borrar.addEventListener('click', async () => {
      if (!window.confirm(`¿Eliminar «${creacion.nombre}»? Esta acción no se puede deshacer.`)) return
      try {
        await eliminarCreacion(db, creacion.id)
        await refrescar()
        mostrarToast('Creación eliminada.')
      } catch (error) {
        mostrarAlerta(`No se pudo eliminar la creación: ${error instanceof Error ? error.message : 'error desconocido'}.`)
      }
    })
    acciones.append(borrar)

    li.append(info, acciones, notaEl)
    listaCreacionesEl.append(li)
  })
}

const refrescar = async (): Promise<void> => {
  try {
    creaciones = await obtenerTodasLasCreaciones(db)
    creaciones.sort((a, b) => b.fecha.localeCompare(a.fecha))
    contadorEl.textContent = String(creaciones.length)
    notaContadorEl.textContent = creaciones.length === 0 ? 'Aún no hay datos' : 'Guardadas en tu dispositivo'
    pintarCreaciones()
  } catch (error) {
    mostrarAlerta(`No se pudieron leer las creaciones: ${error instanceof Error ? error.message : 'error desconocido'}.`)
  }
}

async function mostrarNota(creacion: Creacion, notaEl: HTMLElement): Promise<void> {
  if (notaEl.dataset.descifrada === '1') {
    notaEl.classList.toggle('is-hidden')
    return
  }
  if (!claveSesion) {
    estadoSeguridadEl.textContent = 'Ingresa tu contraseña y activa el cifrado para leer la nota privada.'
    inputContrasenaEl.focus()
    return
  }
  try {
    notaEl.textContent = await leerNotaPrivada(claveSesion, creacion)
    notaEl.dataset.descifrada = '1'
    notaEl.classList.remove('is-hidden')
  } catch {
    delete notaEl.dataset.descifrada
    notaEl.textContent = 'No se pudo descifrar: la contraseña no coincide. Corrige la contraseña y vuelve a intentarlo.'
    notaEl.classList.remove('is-hidden')
  }
}

async function activarCifrado(): Promise<void> {
  const contrasena = inputContrasenaEl.value
  const confirmacion = inputContrasenaConfirmEl.value

  if (contrasena.length < 8) {
    estadoSeguridadEl.textContent = 'La contraseña debe tener al menos 8 caracteres.'
    inputContrasenaEl.focus()
    return
  }
  if (contrasena !== confirmacion) {
    estadoSeguridadEl.textContent = 'Las contraseñas no coinciden.'
    inputContrasenaConfirmEl.focus()
    return
  }

  try {
    let sal = await obtenerConfig<Uint8Array>(db, 'sal')
    if (!sal) {
      sal = crypto.getRandomValues(new Uint8Array(16))
      await guardarConfig(db, 'sal', sal)
    }
    const clave = await derivarClaveDesdeContrasena(contrasena, sal)
    const verificador = await obtenerConfig<Verificador>(db, 'verificador')
    let avisoNotasAnteriores = false

    if (verificador) {
      try {
        const texto = await descifrarTexto(clave, verificador)
        if (texto !== TEXTO_VERIFICADOR) throw new Error('verificador inválido')
      } catch {
        estadoSeguridadEl.textContent = 'Contraseña incorrecta. No se activó el cifrado.'
        estadoCifradoEl.textContent = claveSesion ? 'Cifrado activo' : 'Cifrado inactivo'
        return
      }
    } else {
      const { cifrado, iv } = await cifrarTexto(clave, TEXTO_VERIFICADOR)
      await guardarConfig(db, 'verificador', { cifrado, iv })
      avisoNotasAnteriores = creaciones.some(creacion => creacion.notaCifrada)
    }

    claveSesion = clave
    document.querySelectorAll<HTMLElement>('.creation-note').forEach(nota => {
      delete nota.dataset.descifrada
      nota.textContent = ''
      nota.classList.add('is-hidden')
    })
    inputContrasenaEl.value = ''
    inputContrasenaConfirmEl.value = ''
    estadoSeguridadEl.textContent = avisoNotasAnteriores
      ? 'Cifrado activo. Las notas anteriores solo se leerán si usaste la misma contraseña.'
      : 'Cifrado activo para esta sesión. La contraseña no se guarda.'
    estadoCifradoEl.textContent = 'Cifrado activo'
    ocultarAlerta()
    mostrarToast('Cifrado activado. Ya puedes guardar notas privadas.')
  } catch (error) {
    estadoSeguridadEl.textContent = `No se pudo activar el cifrado: ${error instanceof Error ? error.message : 'error desconocido'}.`
  }
}

formCreacionEl.addEventListener('submit', async evento => {
  evento.preventDefault()
  const nombre = inputNombreEl.value.trim()
  const nota = inputNotaEl.value.trim()
  if (!nombre) {
    estadoSeguridadEl.textContent = 'Ponle un nombre a la creación.'
    inputNombreEl.focus()
    return
  }
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

  try {
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
    mostrarToast('Creación guardada en tu dispositivo.')
    ocultarAlerta()
  } catch (error) {
    mostrarAlerta(`No se pudo guardar la creación: ${error instanceof Error ? error.message : 'error desconocido'}.`)
  }
})

// ---------------------------------------------------------------------------
// Cámara, foto, video y ubicación
function setEstadoCamara(texto: string): void {
  camaraEstadoEl.textContent = texto
}

function pintaAdjuntosFormulario(): void {
  if (adjuntoFotoUrl) {
    URL.revokeObjectURL(adjuntoFotoUrl)
    adjuntoFotoUrl = null
  }
  adjuntosCreacionEl.innerHTML = ''
  if (fotoPendiente) {
    adjuntoFotoUrl = URL.createObjectURL(fotoPendiente)
    const img = document.createElement('img')
    img.className = 'creation-thumb'
    img.src = adjuntoFotoUrl
    img.alt = 'Foto adjunta a la creación'
    adjuntosCreacionEl.append(img)
  }
  if (ubicacionPendiente) {
    const chip = document.createElement('span')
    chip.className = 'chip'
    chip.textContent = `📍 ${ubicacionPendiente.lat.toFixed(4)}, ${ubicacionPendiente.lon.toFixed(4)} (±${ubicacionPendiente.precision} m)`
    adjuntosCreacionEl.append(chip)
  }
}

function detenerMedidor(): void {
  cancelAnimationFrame(animacionNivel)
  animacionNivel = 0
  medidor?.cerrar()
  medidor = null
  nivelAudioEl.classList.add('is-hidden')
  nivelAudioBarraEl.style.width = '0%'
}

function iniciarMedidor(): void {
  if (!streamActual) return
  detenerMedidor()
  medidor = crearMedidorDeNivel(streamActual)
  nivelAudioEl.classList.remove('is-hidden')
  const paso = () => {
    if (!medidor) return
    nivelAudioBarraEl.style.width = `${Math.round(medidor.leer() * 100)}%`
    animacionNivel = requestAnimationFrame(paso)
  }
  animacionNivel = requestAnimationFrame(paso)
}

async function iniciarStream(): Promise<void> {
  if (!mediaDisponible()) {
    setEstadoCamara('La cámara solo funciona en HTTPS o en localhost.')
    return
  }
  try {
    setEstadoCamara('Pidiendo permiso…')
    const stream = tipoMedio === 'video' ? await abrirFlujoConAudio(facingMode) : await abrirCamara(facingMode)

    // Si el usuario cerró el diálogo o cambió de pestaña mientras el permiso
    // estaba pendiente, no dejamos la cámara encendida por detrás.
    if (!dlgCamaraEl.open || document.hidden) {
      detenerFlujo(stream)
      return
    }

    detenerFlujo(streamActual)
    streamActual = stream
    videoCamaraEl.srcObject = streamActual
    videoCamaraEl.classList.toggle('is-mirror', facingMode === 'user')
    setEstadoCamara('')
    if (tipoMedio === 'video' && streamActual.getAudioTracks().length > 0) iniciarMedidor()
    else detenerMedidor()
    btnCambiarCamaraEl.classList.toggle('is-hidden', (await contarCamaras()) < 2)
  } catch (error) {
    setEstadoCamara(describirErrorCamara(error))
  }
}

function detenerCamara(): void {
  detenerGrabacion()
  detenerMedidor()
  detenerFlujo(streamActual)
  streamActual = null
  videoCamaraEl.srcObject = null
}

function aplicarModo(tipo: 'foto' | 'video'): void {
  tipoMedio = tipo
  tabFotoEl.classList.toggle('is-active', tipo === 'foto')
  tabVideoEl.classList.toggle('is-active', tipo === 'video')
  tabFotoEl.setAttribute('aria-selected', String(tipo === 'foto'))
  tabVideoEl.setAttribute('aria-selected', String(tipo === 'video'))
  btnCapturarEl.classList.toggle('is-hidden', tipo === 'video')
  controlesVideoEl.classList.toggle('is-hidden', tipo === 'foto')
  if (tipo === 'foto') nivelAudioEl.classList.add('is-hidden')
}

async function cambiarMedio(tipo: 'foto' | 'video'): Promise<void> {
  if (grabando || tipo === tipoMedio) return
  aplicarModo(tipo)
  camaraPreviewEl.classList.add('is-hidden')
  detenerMedidor()
  detenerFlujo(streamActual)
  streamActual = null
  await iniciarStream()
  if (tipo === 'video') {
    setEstadoCamara(
      grabacionDisponible()
        ? `Listo para grabar. Máximo ${MAX_SEGUNDOS_VIDEO} s.`
        : 'Este navegador no puede grabar video (sin MediaRecorder). Usa el modo Foto.',
    )
  }
}

function pintaTiempoRec(): void {
  const mm = String(Math.floor(segundosRec / 60)).padStart(2, '0')
  const ss = String(segundosRec % 60).padStart(2, '0')
  recTiempoEl.textContent = `${mm}:${ss}`
}

function iniciarGrabacion(): void {
  if (!streamActual || !grabacionDisponible()) return
  try {
    grabadora = crearGrabadora(streamActual)
    grabadora.iniciar()
    grabando = true
    segundosRec = 0
    pintaTiempoRec()
    recIndicadorEl.classList.remove('is-hidden')
    btnGrabarEl.textContent = '■ Detener'
    temporizadorRec = window.setInterval(() => {
      segundosRec++
      pintaTiempoRec()
      if (segundosRec >= MAX_SEGUNDOS_VIDEO) void finalizarGrabacion()
    }, 1000)
  } catch (error) {
    setEstadoCamara(`No se pudo iniciar la grabación: ${error instanceof Error ? error.message : 'error desconocido'}.`)
  }
}

function detenerGrabacion(): void {
  clearInterval(temporizadorRec)
  temporizadorRec = 0
  grabando = false
  recIndicadorEl.classList.add('is-hidden')
  btnGrabarEl.textContent = '● Grabar'
  grabadora?.destruir()
  grabadora = null
}

async function finalizarGrabacion(): Promise<void> {
  if (!grabadora) return
  const clip = await grabadora.detener()
  detenerGrabacion()
  if (clip.size === 0) {
    setEstadoCamara('La grabación quedó vacía. Intenta de nuevo.')
    return
  }
  if (clip.size > MAX_BYTES_VIDEO) {
    setEstadoCamara('El clip supera los 40 MB. Graba uno más corto para guardarlo.')
    return
  }
  if (previewUrl) URL.revokeObjectURL(previewUrl)
  previewUrl = URL.createObjectURL(clip)
  previewVideoEl.src = previewUrl
  previewImgEl.classList.add('is-hidden')
  previewVideoEl.classList.remove('is-hidden')
  capturaCamara = clip
  camaraPreviewEl.classList.remove('is-hidden')
  setEstadoCamara(`Clip de ${segundosRec} s listo. Ponle nombre y guárdalo.`)
}

async function abrirCamaraVista(modo: 'adjuntar' | 'crear'): Promise<void> {
  modoEntrada = modo
  camaraTituloEl.textContent = modo === 'adjuntar' ? 'Tomar foto para la creación' : 'Cámara en vivo'
  camaraPreviewDatosEl.classList.toggle('is-hidden', modo !== 'crear')
  modoTabsEl.classList.toggle('is-hidden', modo === 'adjuntar')
  camaraPreviewEl.classList.add('is-hidden')
  previewImgEl.classList.remove('is-hidden')
  previewVideoEl.classList.add('is-hidden')
  camaraNombreEl.value = ''
  capturaCamara = null
  ubicacionCamara = null
  aplicarModo(modo === 'adjuntar' ? 'foto' : tipoMedio)
  setEstadoCamara('')

  const estado = await estadoPermiso('camera')
  if (estado === 'denied') {
    permisoTituloEl.textContent = 'Cámara bloqueada'
    permisoTextoEl.textContent =
      'Bloqueaste el permiso de cámara. Habilítalo desde el candado de la barra de direcciones para volver a usarla.'
    btnPermisoContinuarEl.classList.add('is-hidden')
    btnPermisoCancelarEl.textContent = 'Entendido'
  } else {
    const esVideo = tipoMedio === 'video'
    permisoTituloEl.textContent = esVideo ? 'Usaremos tu cámara y tu micrófono' : 'Usaremos tu cámara solo para la foto'
    permisoTextoEl.textContent = esVideo
      ? 'El clip se queda en tu dispositivo (IndexedDB); no se envía a ningún servidor.'
      : 'La foto y la ubicación se quedan en tu dispositivo (IndexedDB); no se envían a ningún servidor.'
    btnPermisoContinuarEl.classList.remove('is-hidden')
    btnPermisoCancelarEl.textContent = 'Ahora no'
  }
  dlgPermisoEl.showModal()
}

btnAbrirCamaraEl.addEventListener('click', () => void abrirCamaraVista('crear'))
btnPermisoContinuarEl.addEventListener('click', async () => {
  dlgPermisoEl.close()
  if (!dlgCamaraEl.open) dlgCamaraEl.showModal()
  await iniciarStream()
  if (tipoMedio === 'video') {
    setEstadoCamara(
      grabacionDisponible()
        ? `Listo para grabar. Máximo ${MAX_SEGUNDOS_VIDEO} s.`
        : 'Este navegador no puede grabar video (sin MediaRecorder). Usa el modo Foto.',
    )
  }
})
btnPermisoCancelarEl.addEventListener('click', () => dlgPermisoEl.close())
btnCerrarCamaraEl.addEventListener('click', () => dlgCamaraEl.close())

tabFotoEl.addEventListener('click', () => void cambiarMedio('foto'))
tabVideoEl.addEventListener('click', () => void cambiarMedio('video'))

dlgCamaraEl.addEventListener('close', () => {
  detenerCamara()
  camaraPreviewEl.classList.add('is-hidden')
  previewUbicacionEl.classList.add('is-hidden')
  previewVideoEl.classList.add('is-hidden')
  previewImgEl.classList.remove('is-hidden')
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
    previewUrl = null
  }
  capturaCamara = null
  ubicacionCamara = null
  setEstadoCamara('')
})

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return
  if (streamActual || grabando) {
    detenerCamara()
    if (dlgCamaraEl.open) dlgCamaraEl.close()
    mostrarToast('La cámara se apagó al salir de la página. Vuelve a activarla cuando quieras.')
  }
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
    previewVideoEl.classList.add('is-hidden')
    previewImgEl.classList.remove('is-hidden')
    capturaCamara = blob
    camaraPreviewEl.classList.remove('is-hidden')
    setEstadoCamara('Foto capturada. Ponle nombre y guárdala.')
  } catch (error) {
    setEstadoCamara(describirErrorCamara(error))
  }
})

btnGrabarEl.addEventListener('click', async () => {
  if (grabando) await finalizarGrabacion()
  else if (!grabacionDisponible()) setEstadoCamara('Este navegador no puede grabar video (sin MediaRecorder).')
  else iniciarGrabacion()
})

btnCambiarCamaraEl.addEventListener('click', async () => {
  if (grabando) return
  facingMode = facingMode === 'environment' ? 'user' : 'environment'
  camaraPreviewEl.classList.add('is-hidden')
  detenerMedidor()
  detenerFlujo(streamActual)
  streamActual = null
  await iniciarStream()
})

btnUbicacionCamaraEl.addEventListener('click', async () => {
  try {
    const ubicacion = await obtenerUbicacion()
    if (modoEntrada === 'adjuntar') {
      ubicacionPendiente = ubicacion
      pintaAdjuntosFormulario()
      adjuntosEstadoEl.textContent = `Ubicación adjunta: ${ubicacion.lat.toFixed(4)}, ${ubicacion.lon.toFixed(4)} (±${ubicacion.precision} m).`
    } else {
      ubicacionCamara = ubicacion
      previewUbicacionEl.textContent = `📍 ${ubicacion.lat.toFixed(4)}, ${ubicacion.lon.toFixed(4)} (±${ubicacion.precision} m)`
      previewUbicacionEl.classList.remove('is-hidden')
    }
    setEstadoCamara(`Ubicación: ${ubicacion.lat.toFixed(4)}, ${ubicacion.lon.toFixed(4)} (±${ubicacion.precision} m)`)
  } catch (error) {
    setEstadoCamara(describirErrorUbicacion(error))
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
  try {
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
    mostrarToast('Creación guardada en tu dispositivo.')
    ocultarAlerta()
  } catch (error) {
    mostrarAlerta(`No se pudo guardar la creación: ${error instanceof Error ? error.message : 'error desconocido'}.`)
  }
})

// ---------------------------------------------------------------------------
// Visor de creaciones
function abrirVisor(creacion: Creacion): void {
  const medio = creacion.video ?? creacion.foto
  if (!medio) return
  if (urlVisor) URL.revokeObjectURL(urlVisor)
  urlVisor = URL.createObjectURL(medio)
  const esVideo = Boolean(creacion.video)
  verVisorTituloEl.textContent = esVideo ? 'Video guardado' : 'Foto guardada'
  if (esVideo) {
    videoReproEl.src = urlVisor
    videoReproEl.classList.remove('is-hidden')
    imagenReproEl.classList.add('is-hidden')
    imagenReproEl.removeAttribute('src')
    void videoReproEl.play().catch(() => {})
  } else {
    imagenReproEl.src = urlVisor
    imagenReproEl.classList.remove('is-hidden')
    videoReproEl.classList.add('is-hidden')
    videoReproEl.removeAttribute('src')
  }
  dlgVerVideoEl.showModal()
}

btnCerrarVerVideoEl.addEventListener('click', () => dlgVerVideoEl.close())
dlgVerVideoEl.addEventListener('close', () => {
  videoReproEl.pause()
  videoReproEl.removeAttribute('src')
  imagenReproEl.removeAttribute('src')
  if (urlVisor) {
    URL.revokeObjectURL(urlVisor)
    urlVisor = null
  }
})

btnFotoCreacionEl.addEventListener('click', () => void abrirCamaraVista('adjuntar'))
btnUbicacionCreacionEl.addEventListener('click', async () => {
  try {
    ubicacionPendiente = await obtenerUbicacion()
    pintaAdjuntosFormulario()
    adjuntosEstadoEl.textContent = `Ubicación adjunta: ${ubicacionPendiente.lat.toFixed(4)}, ${ubicacionPendiente.lon.toFixed(4)} (±${ubicacionPendiente.precision} m).`
  } catch (error) {
    adjuntosEstadoEl.textContent = describirErrorUbicacion(error)
  }
})

btnActivarCifradoEl.addEventListener('click', () => void activarCifrado())

// ---------------------------------------------------------------------------
// Preparación offline
async function actualizarEstadoOffline(): Promise<void> {
  const estado = await estadoModelosOffline()
  if (estado.listo) {
    offlineEstadoEl.textContent = 'Modelos listos. El reconocimiento de gestos funciona sin conexión.'
    btnPrepararOfflineEl.textContent = 'Disponible sin conexión'
    btnPrepararOfflineEl.disabled = true
  } else {
    offlineEstadoEl.textContent = `Faltan ${2 - estado.tareas + (estado.wasm ? 0 : 1)} archivos de modelo para usar gestos sin conexión.`
    btnPrepararOfflineEl.textContent = 'Preparar sin conexión'
    btnPrepararOfflineEl.disabled = false
  }
}

btnPrepararOfflineEl.addEventListener('click', async () => {
  btnPrepararOfflineEl.disabled = true
  offlineProgresoEl.hidden = false
  offlineProgresoEl.value = 0
  offlineEstadoEl.textContent = 'Descargando modelos de visión…'
  try {
    const estado = await prepararModelosOffline((hechos, total, detalle) => {
      offlineProgresoEl.max = total
      offlineProgresoEl.value = hechos
      const archivo = detalle.split('/').pop() ?? detalle
      offlineEstadoEl.textContent = `Descargando ${hechos}/${total}: ${archivo}`
    })
    if (estado.listo) {
      mostrarToast('Modelos listos para usar sin conexión.')
    }
  } catch (error) {
    mostrarAlerta(`No se pudieron preparar los modelos: ${error instanceof Error ? error.message : 'error desconocido'}.`)
  } finally {
    offlineProgresoEl.hidden = true
    await actualizarEstadoOffline()
  }
})

// ---------------------------------------------------------------------------
// Instalación, conexión y service worker
window.addEventListener('beforeinstallprompt', evento => {
  const eventoInstalable = evento as EventoInstalacion
  eventoInstalable.preventDefault()
  eventoInstalacion = eventoInstalable
  pintarInstalacion()
})

window.addEventListener('appinstalled', () => {
  eventoInstalacion = null
  pintarInstalacion()
  mostrarToast('gestIA quedó instalada. Ábrela desde su icono.')
})

btnInstalarEl.addEventListener('click', () => void pedirInstalacion())
btnActualizarEl.addEventListener('click', async () => {
  if (!actualizarSW) {
    mostrarAlerta('El service worker todavía no está listo. Recarga la página e intenta de nuevo.')
    return
  }
  btnActualizarEl.disabled = true
  btnActualizarEl.textContent = 'Actualizando…'
  try {
    await actualizarSW(true)
    // Si el SW nuevo no llegó a activarse, la página no se recarga: en ese caso
    // no hay que dejarse el botón "Actualizando…" para siempre.
    window.setTimeout(async () => {
      if (!btnActualizarEl.disabled) return
      const registro = await navigator.serviceWorker?.getRegistration()
      const hayPendiente = Boolean(registro?.waiting ?? registro?.installing)
      btnActualizarEl.disabled = false
      btnActualizarEl.textContent = 'Actualizar'
      if (!hayPendiente) {
        actualizacionDisponible = false
        actualizarBotonActualizar()
        mostrarToast('Ya tienes la última versión instalada.')
      } else {
        mostrarAlerta('La actualización no se pudo aplicar. Cierra todas las pestañas de la app y vuelve a abrirla.')
      }
    }, 3000)
  } catch (error) {
    mostrarAlerta(`No se pudo actualizar la app: ${error instanceof Error ? error.message : 'error desconocido'}.`)
    btnActualizarEl.disabled = false
    btnActualizarEl.textContent = 'Actualizar'
  }
})
window.matchMedia('(display-mode: standalone)').addEventListener('change', pintarInstalacion)
window.addEventListener('online', actualizarConexion)
window.addEventListener('offline', actualizarConexion)

actualizarSW = registerSW({
  immediate: true,
  onOfflineReady() {
    mostrarToast('La app ya funciona sin conexión.')
  },
  onNeedRefresh() {
    actualizacionDisponible = true
    actualizarBotonActualizar()
    mostrarToast('Hay una versión nueva disponible. Pulsa «Actualizar» cuando termines.')
  },
  onRegisteredSW(swUrl, registration) {
    console.log('SW de Workbox registrado:', swUrl, registration)
    if (!registration) return
    // Revisar al recuperar el foco y cada 15 min. El SW compara su propio
    // archivo con el servidor, así que con /sw.js servido como no-cache la
    // detección es inmediata tras desplegar.
    const revisar = () => {
      void registration.update().catch(() => {
        // Sin red o servidor caído: se reintenta en la próxima revisión.
      })
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) revisar()
    })
    window.addEventListener('focus', revisar)
    window.setInterval(revisar, 15 * 60 * 1000)
  },
  onRegisterError(error) {
    console.error('Error al registrar el SW de Workbox:', error)
    mostrarAlerta('No se pudo activar el modo sin conexión. La app sigue funcionando con conexión.')
  },
})

// ---------------------------------------------------------------------------
// Núcleo de visión: gestos → memes.
const gestos = montarGestos()
document.querySelectorAll<HTMLButtonElement>('[data-abrir-gestos]').forEach(boton => {
  boton.addEventListener('click', () => void gestos.abrir())
})

async function iniciar(): Promise<void> {
  actualizarConexion()
  pintarInstalacion()
  pintarGestos()
  heroMemeEl.src = urlMeme('like', 0)
  heroMemeEl.alt = 'Meme de ejemplo: pulgar arriba'
  await actualizarEstadoOffline()

  try {
    db = await abrirBaseDeDatos()
    db.onversionchange = () => db.close()
    await refrescar()
    try {
      await navigator.storage?.persist?.()
    } catch {
      // Persistencia opcional: el navegador puede ignorarla.
    }
  } catch (error) {
    mostrarAlerta(`No se pudo abrir el almacenamiento local: ${error instanceof Error ? error.message : 'error desconocido'}.`)
  }
}

void iniciar()
