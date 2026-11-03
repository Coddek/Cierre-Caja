import { describe, expect, it } from 'vitest'
import type { Database } from './database.types'
import type { CierreConEditor } from './types'
import { avisoCajaInicial } from './avisoCajaInicial'
import { mensajeError } from './errors'
import { formatMonto } from './format'
import { resumenCierreTexto } from './resumenTexto'

type Gasto = Database['public']['Tables']['gastos']['Row']

describe('avisoCajaInicial', () => {
  it('no avisa si la caja inicial coincide con lo que quedó el día anterior', () => {
    expect(avisoCajaInicial(1000, { fecha: '2026-11-02', caja_final: 1000 })).toBeNull()
    expect(avisoCajaInicial(1000, { fecha: '2026-11-02', caja_final: 1000.004 })).toBeNull()
  })

  it('no avisa si falta alguno de los dos datos', () => {
    expect(avisoCajaInicial(null, { fecha: '2026-11-02', caja_final: 1000 })).toBeNull()
    expect(avisoCajaInicial(1000, { fecha: '2026-11-02', caja_final: null })).toBeNull()
    expect(avisoCajaInicial(1000, null)).toBeNull()
  })

  it('avisa con la fecha del día anterior si no coinciden', () => {
    const aviso = avisoCajaInicial(1000, { fecha: '2026-11-02', caja_final: 1500 })
    expect(aviso).toContain('02/11')
    expect(aviso).toContain(formatMonto(1500))
  })
})

describe('mensajeError', () => {
  it('error de red', () => {
    expect(mensajeError(new TypeError('Failed to fetch'))).toMatch(/conexión a internet/)
  })

  it('día ya cerrado (trigger P0001) muestra la fecha', () => {
    const msg = mensajeError({ code: 'P0001', message: 'El día 2026-11-02 ya está cerrado' })
    // El cero inicial depende de los datos de idioma del entorno (Node vs navegador)
    expect(msg).toMatch(/^Ese día \(0?2\/11\) ya está cerrado/)
  })

  it('violaciones de check y not null', () => {
    expect(mensajeError({ code: '23514', message: 'x' })).toMatch(/valor que no es válido/)
    expect(mensajeError({ code: '23502', message: 'x' })).toMatch(/campo obligatorio/)
  })

  it('permisos', () => {
    expect(mensajeError({ code: '42501', message: 'x' })).toBe('No tenés permiso para hacer esto.')
  })

  it('sesión vencida', () => {
    expect(mensajeError({ message: 'JWT expired' })).toBe('Tu sesión expiró. Volvé a ingresar.')
  })

  it('sin error o desconocido: mensaje genérico', () => {
    expect(mensajeError(null)).toMatch(/Algo salió mal/)
    expect(mensajeError({ code: '99999', message: 'raro' })).toMatch(/no se pudo guardar/)
  })
})

describe('resumenCierreTexto', () => {
  const cierre = {
    fecha: '2026-11-03',
    total_ventas: 5000,
    totales_por_medio: { Débito: 3000, Efectivo: 2000 },
    caja_inicial: 1000,
    efectivo_esperado: 2800,
    retiro: 2000,
    caja_final: 800,
    diferencia_caja: 0,
    reabierto_en: null,
    usuarios_caja: null,
  } as unknown as CierreConEditor
  const gastos = [{ descripcion: 'Limpieza', monto: 200 }] as Gasto[]

  it('arma el resumen con efectivo primero y la caja coincidiendo', () => {
    const texto = resumenCierreTexto(cierre, gastos)
    const lineas = texto.split('\n')
    expect(lineas[0]).toBe('*Cierre de caja 03/11/2026*')
    expect(lineas[3]).toBe(`Efectivo: ${formatMonto(2000)}`)
    expect(lineas[4]).toBe(`Débito: ${formatMonto(3000)}`)
    expect(texto).toContain(`Gasto Limpieza: − ${formatMonto(200)}`)
    expect(lineas.at(-1)).toBe('✓ La caja coincide')
  })

  it('avisa si faltan o sobran pesos', () => {
    expect(resumenCierreTexto({ ...cierre, diferencia_caja: -150 }, [])).toContain(`⚠ Faltan ${formatMonto(150)}`)
    expect(resumenCierreTexto({ ...cierre, diferencia_caja: 150 }, [])).toContain(`⚠ Sobran ${formatMonto(150)}`)
  })

  it('indica quién editó un día reabierto', () => {
    const editado = { ...cierre, reabierto_en: '2026-11-04T10:00:00Z', usuarios_caja: { nombre: 'Ana' } }
    expect(resumenCierreTexto(editado, []).split('\n').at(-1)).toBe('(Editado por Ana)')
  })
})
