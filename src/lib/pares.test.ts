import { describe, expect, it } from 'vitest'
import { descripcionPares, elegirPar, leerEncontrados, sumaPares, type ParEncontrado } from './pares'

const paris: ParEncontrado = {
  codigo: '7900067313927',
  talle_id: 't37',
  producto: 'Sandalia Paris',
  ref: '6291.900',
  precio: 89900,
  color: 'Negro 01',
  foto_path: null,
  talles: [
    { id: 't37', talle: 37, talle_br: 36, stock: 2 },
    { id: 't38', talle: 38, talle_br: 37, stock: 0 },
  ],
}

describe('elegirPar', () => {
  it('arma el par con modelo, color, talle y precio', () => {
    expect(elegirPar(paris, 't37')).toEqual({
      talleId: 't37',
      producto: 'Sandalia Paris',
      color: 'Negro 01',
      talle: 37,
      precio: 89900,
      sinStock: false,
    })
  })

  it('marca el par que el sistema tenía sin stock', () => {
    expect(elegirPar(paris, 't38')?.sinStock).toBe(true)
  })

  it('devuelve null si el talle no es de ese color', () => {
    expect(elegirPar(paris, 'otro')).toBeNull()
  })
})

describe('sumaPares y descripcionPares', () => {
  const pares = [elegirPar(paris, 't37')!, elegirPar(paris, 't38')!]

  it('suma los precios para proponer el monto', () => {
    expect(sumaPares(pares)).toBe(179800)
    expect(sumaPares([])).toBe(0)
  })

  it('describe la venta con modelo, color y talle', () => {
    expect(descripcionPares(pares)).toBe('Sandalia Paris Negro 01 T37, Sandalia Paris Negro 01 T38')
  })
})

describe('leerEncontrados', () => {
  it('acepta una fila (búsqueda por código) o una lista (búsqueda manual)', () => {
    expect(leerEncontrados(paris)).toHaveLength(1)
    expect(leerEncontrados([paris, paris])).toHaveLength(2)
  })

  it('código no cargado: lista vacía', () => {
    expect(leerEncontrados(null)).toEqual([])
  })
})
