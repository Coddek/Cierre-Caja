import type { Database } from './database.types'

type Venta = Database['public']['Tables']['ventas']['Row']

// Misma lógica que cerrar_dia() en la base, pero calculada en el cliente
// para la vista previa en vivo (antes de cerrar el día de verdad).
export function calcularTotalesPorMedio(ventas: Venta[]): Record<string, number> {
  const totales: Record<string, number> = {}
  for (const v of ventas) {
    totales[v.medio_pago] = (totales[v.medio_pago] ?? 0) + v.monto
    if (v.medio_pago_2 && v.monto_2) {
      totales[v.medio_pago_2] = (totales[v.medio_pago_2] ?? 0) + v.monto_2
    }
  }
  return totales
}
