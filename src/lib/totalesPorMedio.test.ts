import { describe, expect, it } from 'vitest'
import type { Database } from './database.types'
import {
  MEDIO_EFECTIVO,
  calcularEfectivoEsperado,
  calcularTotalesPorMedio,
  ordenarMedios,
  pagosPorMedio,
} from './totalesPorMedio'

type Venta = Database['public']['Tables']['ventas']['Row']
type Gasto = Database['public']['Tables']['gastos']['Row']

let n = 0
const venta = (monto: number, medio: string, extra: Partial<Venta> = {}): Venta => ({
  id: `v${++n}`,
  created_at: '2026-11-03T12:00:00Z',
  descripcion: null,
  fecha: '2026-11-03',
  medio_pago: medio,
  medio_pago_2: null,
  monto,
  monto_2: null,
  ...extra,
})
const gasto = (monto: number): Gasto => ({
  id: `g${++n}`,
  created_at: '2026-11-03T12:00:00Z',
  descripcion: 'Gasto',
  fecha: '2026-11-03',
  monto,
})

describe('calcularTotalesPorMedio', () => {
  it('suma las ventas de cada medio', () => {
    const totales = calcularTotalesPorMedio([
      venta(1000, MEDIO_EFECTIVO),
      venta(500, MEDIO_EFECTIVO),
      venta(2000, 'Débito'),
    ])
    expect(totales).toEqual({ [MEDIO_EFECTIVO]: 1500, Débito: 2000 })
  })

  it('reparte una venta pagada con 2 medios entre los dos', () => {
    const totales = calcularTotalesPorMedio([
      venta(300, MEDIO_EFECTIVO, { medio_pago_2: 'Transferencia', monto_2: 700 }),
    ])
    expect(totales).toEqual({ [MEDIO_EFECTIVO]: 300, Transferencia: 700 })
  })

  it('sin ventas no hay totales', () => {
    expect(calcularTotalesPorMedio([])).toEqual({})
  })
})

describe('pagosPorMedio', () => {
  it('cada parte de una venta dividida conoce el total y el otro medio', () => {
    const pagos = pagosPorMedio([venta(300, MEDIO_EFECTIVO, { medio_pago_2: 'Débito', monto_2: 700 })])
    expect(pagos[MEDIO_EFECTIVO][0].dividido).toEqual({ totalVenta: 1000, otroMedio: 'Débito' })
    expect(pagos['Débito'][0].dividido).toEqual({ totalVenta: 1000, otroMedio: MEDIO_EFECTIVO })
  })

  it('un segundo medio sin monto no cuenta como venta dividida', () => {
    const pagos = pagosPorMedio([venta(500, MEDIO_EFECTIVO, { medio_pago_2: 'Débito', monto_2: null })])
    expect(pagos['Débito']).toBeUndefined()
    expect(pagos[MEDIO_EFECTIVO][0].dividido).toBeNull()
  })
})

describe('calcularEfectivoEsperado', () => {
  it('caja inicial + ventas en efectivo − gastos', () => {
    const ventas = [venta(1000, MEDIO_EFECTIVO), venta(5000, 'Débito')]
    expect(calcularEfectivoEsperado(ventas, [gasto(200)], 3000)).toBe(3800)
  })

  it('las ventas con otros medios no entran a la caja', () => {
    expect(calcularEfectivoEsperado([venta(5000, 'Crédito')], [], 1000)).toBe(1000)
  })

  it('solo la parte en efectivo de una venta dividida entra a la caja', () => {
    const ventas = [venta(400, 'Débito', { medio_pago_2: MEDIO_EFECTIVO, monto_2: 600 })]
    expect(calcularEfectivoEsperado(ventas, [], 0)).toBe(600)
  })

  it('los gastos pueden dejar el esperado en negativo', () => {
    expect(calcularEfectivoEsperado([], [gasto(500)], 100)).toBe(-400)
  })
})

describe('ordenarMedios', () => {
  it('efectivo primero y el resto alfabético', () => {
    expect(ordenarMedios(['Transferencia', 'Débito', MEDIO_EFECTIVO, 'Crédito'])).toEqual([
      MEDIO_EFECTIVO,
      'Crédito',
      'Débito',
      'Transferencia',
    ])
  })

  it('no modifica el array original', () => {
    const medios = ['Débito', MEDIO_EFECTIVO]
    ordenarMedios(medios)
    expect(medios).toEqual(['Débito', MEDIO_EFECTIVO])
  })
})
