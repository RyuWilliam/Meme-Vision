import { describe, expect, it } from 'vitest'
import { cifrarTexto, derivarClaveDesdeContrasena, descifrarTexto } from './cripto.ts'

const sal = new Uint8Array(16).fill(7)

describe('Web Crypto (PBKDF2 + AES-GCM)', () => {
  it('deriva la misma clave y descifra el texto original', async () => {
    const clave = await derivarClaveDesdeContrasena('clave-de-prueba-2026', sal)
    const { cifrado, iv } = await cifrarTexto(clave, 'nota privada de prueba')
    const claveReproducida = await derivarClaveDesdeContrasena('clave-de-prueba-2026', sal)
    await expect(descifrarTexto(claveReproducida, { cifrado, iv })).resolves.toBe(
      'nota privada de prueba',
    )
  })

  it('rechaza el descifrado con otra contraseña', async () => {
    const clave = await derivarClaveDesdeContrasena('clave-correcta', sal)
    const { cifrado, iv } = await cifrarTexto(clave, 'secreto')
    const claveIncorrecta = await derivarClaveDesdeContrasena('clave-incorrecta', sal)
    await expect(descifrarTexto(claveIncorrecta, { cifrado, iv })).rejects.toBeTruthy()
  })
})
