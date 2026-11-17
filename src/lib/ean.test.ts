import { describe, expect, it } from 'vitest'
import { codigoValido, limpiarCodigo } from './ean'

describe('codigoValido', () => {
  it('acepta los códigos reales de las cajas de Vizzano', () => {
    expect(codigoValido('7900123817758')).toBe(true) // Pelica Negro 01, talle 39
    expect(codigoValido('7900067313927')).toBe(true) // Tela Shine, talle 37
    expect(codigoValido('7900067313941')).toBe(true) // Tela Shine, talle 38
  })

  it('rechaza un dígito mal leído o tipeado', () => {
    expect(codigoValido('7900067313920')).toBe(false)
    expect(codigoValido('7900067313947')).toBe(false)
  })

  it('rechaza largos que no son de código de barras', () => {
    expect(codigoValido('')).toBe(false)
    expect(codigoValido('123')).toBe(false)
    expect(codigoValido('79000673139271')).toBe(false)
  })
})

describe('limpiarCodigo', () => {
  it('saca los espacios de cómo viene impreso en la etiqueta', () => {
    expect(limpiarCodigo('7 900067 313927')).toBe('7900067313927')
  })
})
