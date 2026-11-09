import { describe, expect, it } from 'vitest'
import { contarCamarasFisicas, esCamaraVirtual } from './dispositivo.ts'

/**
 * El botón «Cambiar cámara» solo aparece cuando `contarCamaras() >= 2`.
 * El error que se corrigió aquí: se contaban TODAS las entradas `videoinput`,
 * incluidas las virtuales. Con una cámara física y OBS Studio instalado el
 * conteo daba 2 y el botón aparecía aunque solo hubiera una cámara real.
 */

const camara = (label: string) => ({ kind: 'videoinput', label })
const microfono = (label: string) => ({ kind: 'audioinput', label })

describe('esCamaraVirtual', () => {
  it('reconoce las salidas virtuales más comunes', () => {
    expect(esCamaraVirtual('OBS Virtual Camera')).toBe(true)
    expect(esCamaraVirtual('OBS VirtualCam')).toBe(true)
    expect(esCamaraVirtual('XSplit VCam')).toBe(true)
    expect(esCamaraVirtual('ManyCam Virtual Webcam')).toBe(true)
  })

  it('no confunde una cámara física con una virtual', () => {
    expect(esCamaraVirtual('ACER HD User Facing (0408:4033)')).toBe(false)
    expect(esCamaraVirtual('FaceTime HD Camera')).toBe(false)
    expect(esCamaraVirtual('Logitech BRIO')).toBe(false)
  })
})

describe('contarCamarasFisicas', () => {
  it('una física + una virtual cuenta como UNA (el bug original)', () => {
    const dispositivos = [camara('ACER HD User Facing'), camara('OBS Virtual Camera')]
    expect(contarCamarasFisicas(dispositivos)).toBe(1)
  })

  it('dos cámaras físicas sí cuentan como dos', () => {
    const dispositivos = [camara('FaceTime HD Camera'), camara('Logitech BRIO')]
    expect(contarCamarasFisicas(dispositivos)).toBe(2)
  })

  it('ignora los micrófonos y las salidas de audio', () => {
    const dispositivos = [
      camara('ACER HD User Facing'),
      microfono('Micrófono (Realtek)'),
      { kind: 'audiooutput', label: 'Altavoces' },
    ]
    expect(contarCamarasFisicas(dispositivos)).toBe(1)
  })

  it('sin cámaras devuelve cero', () => {
    expect(contarCamarasFisicas([microfono('Micrófono')])).toBe(0)
    expect(contarCamarasFisicas([])).toBe(0)
  })

  it('sin etiquetas (permiso no concedido) cuenta todas, para no ocultar de más', () => {
    // Un navegador sin permiso devuelve label === '' en todos los dispositivos.
    const dispositivos = [camara(''), camara('')]
    expect(contarCamarasFisicas(dispositivos)).toBe(2)
  })

  it('solo virtuales devuelve cero', () => {
    const dispositivos = [camara('OBS Virtual Camera')]
    expect(contarCamarasFisicas(dispositivos)).toBe(0)
  })
})
