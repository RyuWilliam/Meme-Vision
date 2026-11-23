// useCreaciones — IndexedDB y cifrado de la nota privada, expuestos como estado.
//
// En main.ts esto eran ~250 líneas mezcladas con el DOM: leer la base, pintar
// las tarjetas a mano, revocar object URLs, derivar la clave y verificar el
// contraseña con un «verificador» cifrado. Aquí queda la misma lógica, sin
// tocar el DOM: los componentes se encargan de la pintura.
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  abrirBaseDeDatos,
  eliminarCreacion,
  guardarConfig,
  guardarCreacion as insertarCreacion,
  obtenerConfig,
  obtenerTodasLasCreaciones,
  type Creacion,
  type Ubicacion,
} from '../datos/db'
import { cifrarTexto, derivarClaveDesdeContrasena, descifrarTexto } from '../datos/cripto'

const TEXTO_VERIFICADOR = 'memevision-v1'

export type EstadoCifrado = 'inactivo' | 'activo' | 'verificando'

export interface ResultadoGuardado {
  ok: boolean
  mensaje: string
}

export interface UseCreaciones {
  creaciones: Creacion[]
  cargando: boolean
  error: string | null
  /** Clave derivada; null si el cifrado no está activo en esta sesión. */
  cifradoActivo: boolean
  estadoCifrado: EstadoCifrado
  mensajeSeguridad: string
  activarCifrado: (contrasena: string, confirmacion: string) => Promise<void>
  desactivarCifrado: () => void
  guardarCreacion: (datos: DatosNuevaCreacion) => Promise<ResultadoGuardado>
  borrarCreacion: (id: string) => Promise<ResultadoGuardado>
  leerNota: (creacion: Creacion) => Promise<string>
  recargar: () => Promise<void>
}

export interface DatosNuevaCreacion {
  nombre: string
  desafio: string
  notaPrivada: string
  foto?: Blob | null
  video?: Blob | null
  ubicacion?: Ubicacion | null
}

export function useCreaciones(): UseCreaciones {
  // useState con inicializador perezoso: la base se abre una sola vez y no se
  // lee ningún ref durante el render (regla de React).
  const [dbPromesa] = useState<Promise<IDBDatabase>>(() => abrirBaseDeDatos())
  const claveRef = useRef<CryptoKey | null>(null)

  const [creaciones, setCreaciones] = useState<Creacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [estadoCifrado, setEstadoCifrado] = useState<EstadoCifrado>('inactivo')
  const [mensajeSeguridad, setMensajeSeguridad] = useState('Cifrado inactivo en esta sesión.')
  const [cifradoActivo, setCifradoActivo] = useState(false)

  const recargar = useCallback(async () => {
    try {
      const db = await dbPromesa
      const todas = await obtenerTodasLasCreaciones(db)
      // Más recientes primero, sin mutar el arreglo que viene de la base.
      setCreaciones([...todas].sort((a, b) => b.fecha.localeCompare(a.fecha)))
      setError(null)
    } catch (e) {
      setError(`No se pudieron leer las creaciones: ${e instanceof Error ? e.message : 'error desconocido'}.`)
    } finally {
      setCargando(false)
    }
  }, [dbPromesa])

  useEffect(() => {
    // recargar es async: el setState llega tras un await, no durante el efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recargar()
  }, [recargar])

  const activarCifrado = useCallback(
    async (contrasena: string, confirmacion: string) => {
      if (contrasena.length < 8) {
        setMensajeSeguridad('La contraseña debe tener al menos 8 caracteres.')
        return
      }
      if (contrasena !== confirmacion) {
        setMensajeSeguridad('Las contraseñas no coinciden.')
        return
      }

      setEstadoCifrado('verificando')
      try {
        const db = await dbPromesa
        let sal = await obtenerConfig<Uint8Array>(db, 'sal')
        if (!sal) {
          sal = crypto.getRandomValues(new Uint8Array(16))
          await guardarConfig(db, 'sal', sal)
        }

        const clave = await derivarClaveDesdeContrasena(contrasena, sal)
        const verificador = await obtenerConfig<{ cifrado: ArrayBuffer; iv: Uint8Array }>(
          db,
          'verificador',
        )

        if (verificador) {
          // Ya hay una contraseña establecida: hay que comprobar que es la misma.
          try {
            const texto = await descifrarTexto(clave, verificador)
            if (texto !== TEXTO_VERIFICADOR) throw new Error('verificador inválido')
          } catch {
            setEstadoCifrado('inactivo')
            setMensajeSeguridad('Contraseña incorrecta. No se activó el cifrado.')
            return
          }
        } else {
          // Primera vez: se guarda un texto conocido cifrado para verificar después.
          const { cifrado, iv } = await cifrarTexto(clave, TEXTO_VERIFICADOR)
          await guardarConfig(db, 'verificador', { cifrado, iv })
        }

        claveRef.current = clave
        setCifradoActivo(true)
        setEstadoCifrado('activo')
        setMensajeSeguridad(
          'Cifrado activo: las notas nuevas se guardan cifradas. La contraseña no se almacena.',
        )
      } catch (e) {
        setEstadoCifrado('inactivo')
        setMensajeSeguridad(
          `No se pudo activar el cifrado: ${e instanceof Error ? e.message : 'error desconocido'}.`,
        )
      }
    },
    [dbPromesa],
  )

  const desactivarCifrado = useCallback(() => {
    claveRef.current = null
    setCifradoActivo(false)
    setEstadoCifrado('inactivo')
    setMensajeSeguridad('Cifrado inactivo en esta sesión.')
  }, [])

  const guardar = useCallback(
    async (datos: DatosNuevaCreacion): Promise<ResultadoGuardado> => {
      const nombre = datos.nombre.trim()
      const nota = datos.notaPrivada.trim()
      if (!nombre) return { ok: false, mensaje: 'Ponle un nombre a la creación.' }

      // Misma regla que la versión sin framework: si el usuario escribió una
      // nota privada, tiene que haber cifrado activo. Guardarla en claro sin
      // avisar sería incumplir la promesa de privacidad de la app.
      if (nota && !claveRef.current) {
        return {
          ok: false,
          mensaje: 'Para guardar una nota privada, primero activa el cifrado con tu contraseña.',
        }
      }

      try {
        const db = await dbPromesa
        const id = crypto.randomUUID()
        const clave = claveRef.current

        let notaCifrada: ArrayBuffer | null = null
        let notaIv: Uint8Array | null = null
        if (clave && nota) {
          const { cifrado, iv } = await cifrarTexto(clave, nota)
          notaCifrada = cifrado
          notaIv = iv
        }

        const creacion: Creacion = {
          id,
          nombre,
          desafio: datos.desafio,
          fecha: new Date().toISOString(),
          notaCifrada,
          notaIv,
          foto: datos.foto ?? null,
          video: datos.video ?? null,
          ubicacion: datos.ubicacion ?? null,
        }

        await insertarCreacion(db, creacion)
        await recargar()
        return {
          ok: true,
          mensaje: nota ? 'Creación guardada con la nota cifrada.' : 'Creación guardada en tu dispositivo.',
        }
      } catch (e) {
        return {
          ok: false,
          mensaje: `No se pudo guardar: ${e instanceof Error ? e.message : 'error desconocido'}.`,
        }
      }
    },
    [dbPromesa, recargar],
  )

  const borrar = useCallback(
    async (id: string): Promise<ResultadoGuardado> => {
      try {
        const db = await dbPromesa
        await eliminarCreacion(db, id)
        await recargar()
        return { ok: true, mensaje: 'Creación eliminada.' }
      } catch (e) {
        return {
          ok: false,
          mensaje: `No se pudo eliminar: ${e instanceof Error ? e.message : 'error desconocido'}.`,
        }
      }
    },
    [dbPromesa, recargar],
  )

  const leerNota = useCallback(async (creacion: Creacion): Promise<string> => {
    if (!claveRef.current) {
      throw new Error('Ingresa tu contraseña y activa el cifrado para leer la nota privada.')
    }
    return leerNotaPrivada(claveRef.current, creacion)
  }, [])

  return {
    creaciones,
    cargando,
    error,
    cifradoActivo,
    estadoCifrado,
    mensajeSeguridad,
    activarCifrado,
    desactivarCifrado,
    guardarCreacion: guardar,
    borrarCreacion: borrar,
    leerNota,
    recargar,
  }
}

/** Descifra la nota de una creación con la clave de la sesión. */
async function leerNotaPrivada(clave: CryptoKey, creacion: Creacion): Promise<string> {
  if (!creacion.notaCifrada || !creacion.notaIv) {
    throw new Error('Esta creación no tiene una nota cifrada.')
  }
  return descifrarTexto(clave, { cifrado: creacion.notaCifrada, iv: creacion.notaIv })
}
