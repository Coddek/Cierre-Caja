import { describe, expect, it } from 'vitest'
import {
  COLORES_MEDIOS,
  COLOR_OTROS,
  type CierreStats,
  diaDeSemana,
  formatCompacto,
  mezclaMedios,
  mismoDiaAnioAnterior,
  promedioPorDiaSemana,
  sumarDias,
  ventasPorMes,
} from './estadisticas'

const cierre = (fecha: string, total_ventas: number, totales_por_medio: Record<string, number> = {}): CierreStats => ({
  fecha,
  total_ventas,
  totales_por_medio,
})

describe('fechas', () => {
  it('sumarDias cruza meses y años', () => {
    expect(sumarDias('2026-01-31', 1)).toBe('2026-02-01')
    expect(sumarDias('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('diaDeSemana: 0 es lunes y 6 es domingo', () => {
    expect(diaDeSemana('2026-11-02')).toBe(0) // lunes
    expect(diaDeSemana('2026-11-08')).toBe(6) // domingo
  })

  it('mismoDiaAnioAnterior cae en el mismo día de la semana', () => {
    const fecha = '2026-11-07' // sábado
    const anterior = mismoDiaAnioAnterior(fecha)
    expect(anterior).toBe('2025-11-08')
    expect(diaDeSemana(anterior)).toBe(diaDeSemana(fecha))
  })
})

describe('formatCompacto', () => {
  it('millones con un decimal, sin ",0"', () => {
    expect(formatCompacto(4_200_000)).toBe('$ 4,2 M')
    expect(formatCompacto(3_000_000)).toBe('$ 3 M')
  })

  it('miles redondeados y montos chicos', () => {
    expect(formatCompacto(850_400)).toBe('$ 850 mil')
    expect(formatCompacto(900)).toBe('$ 900')
  })
})

describe('ventasPorMes', () => {
  it('sin cierres devuelve vacío', () => {
    expect(ventasPorMes([], '2026-11-03')).toEqual([])
  })

  it('arranca en el primer mes con datos', () => {
    const puntos = ventasPorMes([cierre('2026-09-10', 100), cierre('2026-11-01', 50)], '2026-11-03')
    expect(puntos.map((p) => p.mes)).toEqual(['2026-09', '2026-10', '2026-11'])
    expect(puntos[1].actual).toBeNull() // octubre sin ventas
  })

  it('compara el mes en curso solo contra el mismo tramo del año anterior', () => {
    const puntos = ventasPorMes(
      [
        cierre('2025-11-02', 100), // dentro del tramo (1 al 3)
        cierre('2025-11-20', 999), // fuera del tramo
        cierre('2026-11-01', 80),
      ],
      '2026-11-03',
    )
    const actual = puntos.at(-1)!
    expect(actual).toMatchObject({ mes: '2026-11', actual: 80, anterior: 100, hastaDia: 3 })
  })

  it('los meses cerrados se comparan contra el mes entero del año anterior', () => {
    const puntos = ventasPorMes(
      [cierre('2025-10-05', 100), cierre('2025-10-25', 200), cierre('2026-10-10', 400)],
      '2026-11-03',
    )
    expect(puntos.find((p) => p.mes === '2026-10')).toMatchObject({ actual: 400, anterior: 300, hastaDia: null })
  })

  it('muestra como mucho 12 meses', () => {
    const cierres = Array.from({ length: 24 }, (_, i) => cierre(sumarDias('2024-11-15', i * 30), 10))
    expect(ventasPorMes(cierres, '2026-11-03')).toHaveLength(12)
  })
})

describe('promedioPorDiaSemana', () => {
  it('promedia por día de la semana desde la fecha pedida', () => {
    const puntos = promedioPorDiaSemana(
      [
        cierre('2026-10-26', 999), // lunes, antes de `desde`: no cuenta
        cierre('2026-11-02', 100), // lunes
        cierre('2026-10-27', 300), // martes
        cierre('2026-11-03', 500), // martes
      ],
      '2026-10-27',
    )
    expect(puntos[0]).toEqual({ dia: 'Lunes', promedio: 100, dias: 1 })
    expect(puntos[1]).toEqual({ dia: 'Martes', promedio: 400, dias: 2 })
    expect(puntos[6]).toEqual({ dia: 'Domingo', promedio: null, dias: 0 })
  })
})

describe('mezclaMedios', () => {
  const orden = ['Efectivo', 'Débito', 'Crédito', 'Transferencia', 'QR']

  it('sin ventas devuelve vacío', () => {
    expect(mezclaMedios([], '2026-01-01', orden)).toEqual([])
  })

  it('porcentajes sobre el total y color según el orden de medios_pago', () => {
    const porciones = mezclaMedios([cierre('2026-11-01', 0, { Efectivo: 750, Crédito: 250 })], '2026-11-01', orden)
    expect(porciones).toEqual([
      { nombre: 'Efectivo', total: 750, porcentaje: 75, color: COLORES_MEDIOS[0] },
      { nombre: 'Crédito', total: 250, porcentaje: 25, color: COLORES_MEDIOS[2] },
    ])
  })

  it('del 5.º medio en adelante va a "Otros", incluidos los dados de baja', () => {
    const porciones = mezclaMedios(
      [cierre('2026-11-01', 0, { Efectivo: 100, QR: 50, Cheque: 50 })],
      '2026-11-01',
      orden,
    )
    expect(porciones.at(-1)).toEqual({ nombre: 'Otros', total: 100, porcentaje: 50, color: COLOR_OTROS })
  })

  it('ignora los cierres anteriores a `desde`', () => {
    const porciones = mezclaMedios(
      [cierre('2026-10-01', 0, { Débito: 1000 }), cierre('2026-11-01', 0, { Efectivo: 10 })],
      '2026-11-01',
      orden,
    )
    expect(porciones.map((p) => p.nombre)).toEqual(['Efectivo'])
  })
})
