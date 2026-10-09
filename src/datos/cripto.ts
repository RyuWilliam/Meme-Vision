// cripto.ts — Web Crypto API: hashes, derivación de claves y cifrado.
// Sesión 22 (IndexedDB y Web Crypto API) aplicada a MemeVision.
// Solo funciona en HTTPS o localhost.

/** Calcula el hash SHA-256 de un texto y lo devuelve en hexadecimal. */
export async function calcularHash(texto: string): Promise<string> {
  const datos = new TextEncoder().encode(texto)
  const buffer = await crypto.subtle.digest('SHA-256', datos)
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Deriva una clave AES-GCM reproducible a partir de una contraseña y una sal. */
export async function derivarClaveDesdeContrasena(contrasena: string, sal: Uint8Array): Promise<CryptoKey> {
  const materialBase = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(contrasena),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: sal.buffer as ArrayBuffer, iterations: 100000, hash: 'SHA-256' },
    materialBase,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/** Cifra un texto con AES-GCM. Devuelve el cifrado y el IV (ninguno de los dos es la clave). */
export async function cifrarTexto(clave: CryptoKey, texto: string): Promise<{ cifrado: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const datos = new TextEncoder().encode(texto)
  const cifrado = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, datos)
  return { cifrado, iv }
}

/** Descifra un texto con AES-GCM. Rechaza la promesa si el dato fue alterado. */
export async function descifrarTexto(clave: CryptoKey, datos: { cifrado: ArrayBuffer; iv: Uint8Array }): Promise<string> {
  const descifrado = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: datos.iv.buffer as ArrayBuffer }, clave, datos.cifrado)
  return new TextDecoder().decode(descifrado)
}
