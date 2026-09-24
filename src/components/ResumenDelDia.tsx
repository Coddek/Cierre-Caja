import type { Database } from '../lib/database.types'
import { formatMonto } from '../lib/format'

type Venta = Database['public']['Tables']['ventas']['Row']
type Gasto = Database['public']['Tables']['gastos']['Row']

// Preview calculado en el cliente con lo que ya está cargado en pantalla.
// No persiste nada ni toca la tabla `cierres` — eso solo pasa al llamar
// cerrar_dia(), que es el snapshot real y definitivo del día.
export function ResumenDelDia({ ventas, gastos }: { ventas: Venta[]; gastos: Gasto[] }) {
  const totalEfectivo = ventas.filter((v) => v.medio_pago === 'efectivo').reduce((a, v) => a + v.monto, 0)
  const totalTransferencia = ventas
    .filter((v) => v.medio_pago === 'transferencia')
    .reduce((a, v) => a + v.monto, 0)
  const totalTarjeta = ventas.filter((v) => v.medio_pago === 'tarjeta').reduce((a, v) => a + v.monto, 0)
  const totalVentas = totalEfectivo + totalTransferencia + totalTarjeta
  const totalGastos = gastos.reduce((a, g) => a + g.monto, 0)
  const gananciaNeta = totalVentas - totalGastos

  return (
    <div className="resumen-dia">
      <h2>Resumen de hoy</h2>

      <dl className="resumen-desglose">
        <dt>Efectivo</dt>
        <dd>{formatMonto(totalEfectivo)}</dd>

        <dt>Transferencia</dt>
        <dd>{formatMonto(totalTransferencia)}</dd>

        <dt>Tarjeta</dt>
        <dd>{formatMonto(totalTarjeta)}</dd>
      </dl>

      <dl className="resumen-totales">
        <dt>Total ventas</dt>
        <dd>{formatMonto(totalVentas)}</dd>

        <dt>Total gastos</dt>
        <dd>{formatMonto(totalGastos)}</dd>

        <dt className="ganancia">Ganancia neta</dt>
        <dd className="ganancia">{formatMonto(gananciaNeta)}</dd>
      </dl>
    </div>
  )
}
