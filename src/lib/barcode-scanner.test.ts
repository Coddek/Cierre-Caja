import { describe, expect, it } from 'vitest'
import { cleanBarcode, createConfirmer, isValidBarcode } from './barcode-scanner'

describe('isValidBarcode', () => {
  it('acepta los códigos reales de las cajas de Vizzano', () => {
    expect(isValidBarcode('7900123817758')).toBe(true) // Pelica Negro 01, talle 39
    expect(isValidBarcode('7900067313927')).toBe(true) // Tela Shine, talle 37
    expect(isValidBarcode('7900067313941')).toBe(true) // Tela Shine, talle 38
  })

  it('rechaza un dígito mal leído o tipeado', () => {
    expect(isValidBarcode('7900067313920')).toBe(false)
    expect(isValidBarcode('7900067313947')).toBe(false)
  })

  it('rechaza largos que no son de código de barras', () => {
    expect(isValidBarcode('')).toBe(false)
    expect(isValidBarcode('123')).toBe(false)
    expect(isValidBarcode('79000673139271')).toBe(false)
  })

  it('cleanBarcode saca los espacios de cómo viene impreso en la etiqueta', () => {
    expect(cleanBarcode('7 900067 313927')).toBe('7900067313927')
  })
})

describe('createConfirmer', () => {
  it('acepta un número recién cuando sale dos veces dentro de la ventana', () => {
    const confirmar = createConfirmer(2500)
    expect(confirmar('7900067313927', 0)).toBe(false)
    expect(confirmar('7900067313927', 900)).toBe(true)
  })

  it('una lectura distinta en el medio no cuenta para el otro número', () => {
    const confirmar = createConfirmer(2500)
    expect(confirmar('7900067313927', 0)).toBe(false)
    expect(confirmar('1926407313927', 300)).toBe(false) // lectura equivocada, sale una sola vez
    expect(confirmar('7900067313927', 600)).toBe(true)
  })

  it('dos lecturas muy separadas en el tiempo no confirman', () => {
    const confirmar = createConfirmer(2500)
    expect(confirmar('7900067313927', 0)).toBe(false)
    expect(confirmar('7900067313927', 4000)).toBe(false)
  })
})
