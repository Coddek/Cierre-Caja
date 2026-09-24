import type { Database } from './database.types'

type Venta = Database['public']['Tables']['ventas']['Row']
type Gasto = Database['public']['Tables']['gastos']['Row']

// Nombre del medio en la tabla `medios_pago` que va a la caja física. Tiene
// que coincidir con el que usa cerrar_dia() en la base.
export const MEDIO_EFECTIVO = 'Efectivo'

// Un pago que suma a un medio: una venta entera, o una de las dos partes de
// una venta pagada con 2 medios.
export type Pago = {
  ventaId: string
  descripcion: string | null
  monto: number
  // Si la venta se pagó con 2 medios: el total de la venta y el otro medio.
  dividido: { totalVenta: number; otroMedio: string } | null
}

export function pagosPorMedio(ventas: Venta[]): Record<string, Pago[]> {
  const pagos: Record<string, Pago[]> = {}
  const agregar = (medio: string, pago: Pago) => (pagos[medio] ??= []).push(pago)

  for (const v of ventas) {
    const esDividida = !!(v.medio_pago_2 && v.monto_2)
    const totalVenta = v.monto + (esDividida ? v.monto_2! : 0)
    agregar(v.medio_pago, {
      ventaId: v.id,
      descripcion: v.descripcion,
      monto: v.monto,
      dividido: esDividida ? { totalVenta, otroMedio: v.medio_pago_2! } : null,
    })
    if (esDividida) {
      agregar(v.medio_pago_2!, {
        ventaId: v.id,
        descripcion: v.descripcion,
        monto: v.monto_2!,
        dividido: { totalVenta, otroMedio: v.medio_pago },
      })
    }
  }
  return pagos
}

// Misma lógica que cerrar_dia() en la base, pero calculada en el cliente
// para la vista previa en vivo (antes de cerrar el día de verdad).
export function calcularTotalesPorMedio(ventas: Venta[]): Record<string, number> {
  const totales: Record<string, number> = {}
  for (const [medio, pagos] of Object.entries(pagosPorMedio(ventas))) {
    totales[medio] = pagos.reduce((a, p) => a + p.monto, 0)
  }
  return totales
}

// Efectivo arriba de todo (es el que se cuenta en la caja), el resto alfabético.
export function ordenarMedios(medios: string[]): string[] {
  return [...medios].sort((a, b) =>
    a === MEDIO_EFECTIVO ? -1 : b === MEDIO_EFECTIVO ? 1 : a.localeCompare(b),
  )
}

// Igual que en el cuaderno y en cerrar_dia(): los gastos no tocan los totales
// de ventas, pero se pagan con plata de la caja, así que salen del efectivo.
export function calcularEfectivoEsperado(ventas: Venta[], gastos: Gasto[], cajaInicial: number) {
  const efectivo = calcularTotalesPorMedio(ventas)[MEDIO_EFECTIVO] ?? 0
  return cajaInicial + efectivo - gastos.reduce((a, g) => a + g.monto, 0)
}
