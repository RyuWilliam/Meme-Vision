// App — el árbol de la aplicación React de gestIA.
//
// Reparto de responsabilidades:
//   App            → estado global de UI (qué diálogo está abierto, avisos)
//   hooks/         → lógica: conexión, instalación, creaciones, offline
//   componentes/   → pintura: cabecera, héroe, catálogo, diálogos
//
// La lógica de visión y de datos (src/vision, src/datos, dispositivo.ts) no se
// modificó: es la misma que la versión sin framework.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Cabecera } from './componentes/Cabecera'
import { Heroe } from './componentes/Heroe'
import { CatalogoGestos } from './componentes/CatalogoGestos'
import { SeccionCreaciones } from './componentes/SeccionCreaciones'
import { DialogoGestos } from './componentes/DialogoGestos'
import { DialogoCamara } from './componentes/DialogoCamara'
import { Icono } from './componentes/Icono'
import { useInstalacion } from './hooks/useInstalacion'
import { useCreaciones } from './hooks/useCreaciones'
import { estadoModelosOffline, prepararModelosOffline } from './vision/offline'
import { abrirCamara, capturarFoto, describirErrorUbicacion, detenerFlujo, obtenerUbicacion } from './dispositivo'
import type { Creacion, Ubicacion } from './datos/db'

export function App() {
  const creaciones = useCreaciones()
  const instalacion = useInstalacion()

  const [gestosAbiertos, setGestosAbiertos] = useState(false)
  const [camaraAbierta, setCamaraAbierta] = useState(false)
  const [visor, setVisor] = useState<{ url: string; tipo: 'foto' | 'video'; nombre: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [alerta, setAlerta] = useState<string | null>(null)
  const [fotoPendiente, setFotoPendiente] = useState<Blob | null>(null)
  const [ubicacionPendiente, setUbicacionPendiente] = useState<Ubicacion | null>(null)

  // Estado de los modelos offline.
  const [estadoOffline, setEstadoOffline] = useState('Comprobando modelos…')
  const [offlineListo, setOfflineListo] = useState(false)
  const [progresoOffline, setProgresoOffline] = useState<{ hechos: number; total: number } | null>(null)
  const [preparando, setPreparando] = useState(false)

  const temporizadorToast = useRef(0)

  // El Service Worker con aviso de actualización (registerType: 'prompt').
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onOfflineReady() {
      mostrar('La app ya funciona sin conexión.')
    },
    onRegisterError(error) {
      console.error('Error al registrar el SW de Workbox:', error)
    },
  })

  function mostrar(texto: string) {
    setToast(texto)
    window.clearTimeout(temporizadorToast.current)
    temporizadorToast.current = window.setTimeout(() => setToast(null), 4200)
  }

  const actualizarEstadoOffline = useCallback(async () => {
    const estado = await estadoModelosOffline()
    setOfflineListo(estado.listo)
    setEstadoOffline(
      estado.listo
        ? `Modelos listos (${estado.tareas} tareas + WASM). El reconocimiento funciona sin red.`
        : `Faltan ${3 - estado.tareas - (estado.wasm ? 0 : 1)} archivos por descargar.`,
    )
  }, [])

  useEffect(() => {
    // Es async: el setState llega tras un await, no durante el efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void actualizarEstadoOffline()
  }, [actualizarEstadoOffline])

  // La lista de creaciones cambia cuando se guarda desde el diálogo de cámara.
  const guardarDesdeCamara = useCallback(
    async (datos: { nombre: string; desafio: string; foto: Blob | null; video: Blob | null; ubicacion: Ubicacion | null }) => {
      const resultado = await creaciones.guardarCreacion({
        nombre: datos.nombre,
        desafio: datos.desafio,
        notaPrivada: '',
        foto: datos.foto,
        video: datos.video,
        ubicacion: datos.ubicacion,
      })
      if (resultado.ok) mostrar(resultado.mensaje)
      return resultado
    },
    [creaciones, mostrar],
  )

  const pedirFoto = useCallback(async () => {
    // Se pide dentro del clic, igual que en la versión sin framework.
    try {
      const stream = await abrirCamara('environment')
      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true
      await video.play().catch(() => {})
      await new Promise((r) => setTimeout(r, 400))
      const foto = await capturarFoto(video)
      detenerFlujo(stream)
      setFotoPendiente(foto)
      mostrar('Foto adjunta a la creación.')
    } catch (error) {
      mostrar(`No se pudo tomar la foto: ${error instanceof Error ? error.message : 'error'}.`)
    }
  }, [mostrar])

  const pedirUbicacion = useCallback(async () => {
    try {
      setUbicacionPendiente(await obtenerUbicacion())
      mostrar('Ubicación adjunta.')
    } catch (error) {
      mostrar(describirErrorUbicacion(error))
    }
  }, [mostrar])

  const prepararOffline = useCallback(async () => {
    setPreparando(true)
    try {
      const estado = await prepararModelosOffline((hechos, total) => setProgresoOffline({ hechos, total }))
      setOfflineListo(estado.listo)
      setEstadoOffline(estado.listo ? 'Modelos listos para usar sin red.' : 'La descarga quedó incompleta.')
      if (estado.listo) mostrar('Modelos listos para usar sin conexión.')
    } catch (error) {
      setAlerta(`No se pudieron preparar los modelos: ${error instanceof Error ? error.message : 'error'}.`)
    } finally {
      setPreparando(false)
      setProgresoOffline(null)
    }
  }, [mostrar])

  const verCreacion = useCallback((creacion: Creacion) => {
    const blob = creacion.video ?? creacion.foto
    if (!blob) return
    setVisor({
      url: URL.createObjectURL(blob),
      tipo: creacion.video ? 'video' : 'foto',
      nombre: creacion.nombre,
    })
  }, [])

  // La URL del visor se revoca al cerrarlo o al desmontar.
  useEffect(() => {
    if (!visor) return
    const url = visor.url
    return () => URL.revokeObjectURL(url)
  }, [visor])

  // appinstalled también cierra la ayuda de instalación, como en la versión original.
  useEffect(() => {
    const alInstalar = () => mostrar('gestIA instalado. Ya puedes abrirlo desde tu pantalla de inicio.')
    window.addEventListener('appinstalled', alInstalar)
    return () => window.removeEventListener('appinstalled', alInstalar)
  }, [])

  return (
    <>
      <div className="app-shell">
        <Cabecera
          instalacion={instalacion}
          hayActualizacion={needRefresh}
          alInstalar={() => void instalacion.instalar().then((r) => {
            if (r === 'aceptada') mostrar('Instalación aceptada. Abre gestIA desde su icono.')
            else if (r === 'cancelada') mostrar('Instalación cancelada. Puedes intentarlo desde el menú del navegador.')
          })}
          alActualizar={() => void updateServiceWorker(true)}
        />

        <main id="inicio">
          <Heroe alAbrirCamara={() => setCamaraAbierta(true)} alAbrirGestos={() => setGestosAbiertos(true)} />

          <section className="steps-section" aria-labelledby="pasos-title">
            <div className="section-head">
              <p className="kicker">Cómo funciona</p>
              <h2 id="pasos-title">Tres pasos. Cero fricción.</h2>
            </div>
            <ol className="steps">
              <li>
                <span className="step-num">01</span>
                <h3>Activa la cámara</h3>
                <p>Permite el acceso solo cuando pulses el botón. Puedes cerrar la vista en cualquier momento y la cámara se apaga.</p>
              </li>
              <li>
                <span className="step-num">02</span>
                <h3>Haz tu gesto</h3>
                <p>El modelo reconoce la mano y el rostro en el navegador. Cuando mantienes el gesto, aparece su meme.</p>
              </li>
              <li>
                <span className="step-num">03</span>
                <h3>Guarda tu creación</h3>
                <p>Las fotos, videos y notas se guardan en IndexedDB. La nota privada se cifra con tu contraseña.</p>
              </li>
            </ol>
          </section>

          <CatalogoGestos
            alAbrirGestos={() => setGestosAbiertos(true)}
            estadoOffline={estadoOffline}
            offlineListo={offlineListo || offlineReady}
            progreso={progresoOffline}
            preparando={preparando}
            alPrepararOffline={() => void prepararOffline()}
          />

          <SeccionCreaciones
            creaciones={creaciones}
            fotoPendiente={fotoPendiente}
            ubicacionPendiente={ubicacionPendiente}
            alPedirFoto={() => void pedirFoto()}
            alPedirUbicacion={() => void pedirUbicacion()}
            alQuitarFoto={() => setFotoPendiente(null)}
            alVer={verCreacion}
            alAvisar={mostrar}
          />
        </main>

        <footer className="site-footer">
          <p><strong>gestIA</strong> convierte gestos en memes sin sacar el video de tu dispositivo.</p>
          <p className="footer-small">Hecho para la Electiva PWA · Funciona sin conexión después de preparar los modelos.</p>
          {instalacion.mostrarAyudaIOS && (
            <p id="instalar-ayuda" className="footer-small">
              En iPhone o iPad: toca Compartir y luego «Añadir a pantalla de inicio».
            </p>
          )}
        </footer>
      </div>

      {alerta && (
        <p className="app-alert" role="alert">
          {alerta}
          <button type="button" className="button button-ghost button-small" onClick={() => setAlerta(null)}>Cerrar</button>
        </p>
      )}

      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}

      {gestosAbiertos && <DialogoGestos alCerrar={() => setGestosAbiertos(false)} />}

      {camaraAbierta && (
        <DialogoCamara
          alCerrar={() => setCamaraAbierta(false)}
          alGuardar={guardarDesdeCamara}
        />
      )}

      {visor && (
        <dialog open className="dialog dialog-viewer" aria-labelledby="ver-video-titulo">
          <div className="dialog-head">
            <h2 id="ver-video-titulo">{visor.tipo === 'video' ? 'Vídeo guardado' : 'Foto guardada'}</h2>
            <button
              type="button"
              className="button button-ghost button-small"
              aria-label="Cerrar visor"
              onClick={() => setVisor(null)}
            >
              <Icono nombre="close" />
            </button>
          </div>
          {visor.tipo === 'video' ? (
            <video src={visor.url} controls playsInline aria-label={`Video de ${visor.nombre}`} />
          ) : (
            <img src={visor.url} alt={`Foto de ${visor.nombre}`} />
          )}
        </dialog>
      )}
    </>
  )
}
