// db.ts — IndexedDB de MemeVision: las creaciones del usuario.
// Sesión 22: esquema versionado con migración, CRUD, consultas con cursor y
// nota privada cifrada (acompaña a cripto.ts).

import { cifrarTexto, descifrarTexto } from './cripto.ts'

export interface Creacion {
  id: string
  nombre: string
  desafio: string
  fecha: string
  notaCifrada: ArrayBuffer | null
  notaIv: Uint8Array | null
}

const NOMBRE_DB = 'memevision-db'
const VERSION_DB = 2

/** Abre (o crea / migra) la base de datos. Stores e índices solo se tocan aquí. */
export function abrirBaseDeDatos(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open(NOMBRE_DB, VERSION_DB)

    peticion.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result
      const tx = (event.target as IDBOpenDBRequest).transaction as IDBTransaction
      const version = event.oldVersion // 0 si la base no existía

      if (version < 1) {
        const store = db.createObjectStore('creaciones', { keyPath: 'id' })
        store.createIndex('porDesafio', 'desafio', { unique: false })
        db.createObjectStore('config', { keyPath: 'clave' })
      }

      if (version < 2) {
        // v2: índice por fecha, sin perder las creaciones ya guardadas
        // (un usuario nuevo salta directo a la v2 con ambos bloques).
        const store = tx.objectStore('creaciones')
        store.createIndex('porFecha', 'fecha', { unique: false })
      }
    }

    peticion.onsuccess = event => resolve((event.target as IDBOpenDBRequest).result)
    peticion.onerror = event => reject((event.target as IDBOpenDBRequest).error)
  })
}

/** Envuelve un IDBRequest en una Promise (IndexedDB es basada en eventos). */
function envolver<T>(peticion: IDBRequest<T>, tx?: IDBTransaction): Promise<T> {
  return new Promise((resolve, reject) => {
    peticion.onsuccess = () => resolve(peticion.result)
    peticion.onerror = () => reject(peticion.error)
    if (tx) tx.onabort = () => reject(tx.error)
  })
}

// --- CRUD -------------------------------------------------------------------

/** Guarda una creación nueva. Falla si la clave ya existe. */
export function guardarCreacion(db: IDBDatabase, creacion: Creacion): Promise<IDBValidKey> {
  const tx = db.transaction('creaciones', 'readwrite')
  return envolver(tx.objectStore('creaciones').add(creacion), tx)
}

/** Inserta o actualiza (sin fallar si la clave ya existe). */
export function actualizarCreacion(db: IDBDatabase, creacion: Creacion): Promise<IDBValidKey> {
  const tx = db.transaction('creaciones', 'readwrite')
  return envolver(tx.objectStore('creaciones').put(creacion), tx)
}

/** Recupera una creación por su clave. */
export function obtenerCreacion(db: IDBDatabase, id: string): Promise<Creacion | undefined> {
  const tx = db.transaction('creaciones', 'readonly')
  return envolver(tx.objectStore('creaciones').get(id), tx)
}

/** Recupera todas las creaciones. */
export function obtenerTodasLasCreaciones(db: IDBDatabase): Promise<Creacion[]> {
  const tx = db.transaction('creaciones', 'readonly')
  return envolver(tx.objectStore('creaciones').getAll(), tx)
}

/** Cuenta cuántas creaciones hay, sin traerlas. */
export function contarCreaciones(db: IDBDatabase): Promise<number> {
  const tx = db.transaction('creaciones', 'readonly')
  return envolver(tx.objectStore('creaciones').count(), tx)
}

/** Elimina una creación por su clave. */
export function eliminarCreacion(db: IDBDatabase, id: string): Promise<void> {
  const tx = db.transaction('creaciones', 'readwrite')
  return envolver(tx.objectStore('creaciones').delete(id), tx)
}

// --- Consultas con índice y cursor ------------------------------------------

/** Devuelve las creaciones de un desafío, recorriendo el índice con un cursor. */
export function creacionesPorDesafio(db: IDBDatabase, desafio: string): Promise<Creacion[]> {
  return new Promise((resolve, reject) => {
    const resultado: Creacion[] = []
    const tx = db.transaction('creaciones', 'readonly')
    const indice = tx.objectStore('creaciones').index('porDesafio')
    const cursor = indice.openCursor(IDBKeyRange.only(desafio))

    cursor.onsuccess = event => {
      const c = (event.target as IDBRequest<IDBCursorWithValue | null>).result
      if (c) {
        resultado.push(c.value as Creacion)
        c.continue() // avanza al siguiente registro que coincide
      } else {
        resolve(resultado) // no hay más
      }
    }
    cursor.onerror = () => reject(cursor.error)
  })
}

// --- Configuración (sal del cifrado) ----------------------------------------

/** Guarda un valor de configuración, por clave. */
export function guardarConfig(db: IDBDatabase, clave: string, valor: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('config', 'readwrite')
    const peticion = tx.objectStore('config').put({ clave, valor })
    peticion.onsuccess = () => resolve()
    peticion.onerror = () => reject(peticion.error)
  })
}

/** Lee un valor de configuración. Devuelve undefined si no existe. */
export function obtenerConfig<T>(db: IDBDatabase, clave: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('config', 'readonly')
    const peticion = tx.objectStore('config').get(clave)
    peticion.onsuccess = () => resolve(peticion.result ? (peticion.result.valor as T) : undefined)
    peticion.onerror = () => reject(peticion.error)
  })
}

// --- Creaciones con nota privada cifrada (patrón de la Sesión 22) ----------

/** Guarda una creación cifrando su nota privada; el resto queda plano y consultable. */
export async function guardarCreacionConNota(
  db: IDBDatabase,
  clave: CryptoKey,
  creacion: { id: string; nombre: string; desafio: string; fecha: string; notaPrivada: string }
): Promise<IDBValidKey> {
  const { cifrado, iv } = await cifrarTexto(clave, creacion.notaPrivada)
  return guardarCreacion(db, {
    id: creacion.id,
    nombre: creacion.nombre,
    desafio: creacion.desafio, // plano: tiene índice
    fecha: creacion.fecha,
    notaCifrada: cifrado, // cifrado: solo se lee de a uno
    notaIv: iv,
  })
}

/** Descifra la nota privada de una creación. */
export function leerNotaPrivada(clave: CryptoKey, registro: Creacion): Promise<string> {
  return descifrarTexto(clave, { cifrado: registro.notaCifrada!, iv: registro.notaIv! })
}
