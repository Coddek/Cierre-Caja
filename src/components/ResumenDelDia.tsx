import { Fragment } from 'react'
import type { Database } from '../lib/database.types'
import { formatMonto } from '../lib/format'
import { calcularTotalesPorMedio } from '../lib/totalesPorMedio'

type Venta = Database['public']['Tables']['ventas']['Row']
type Gasto = Database['public']['Tables']['gastos']['Row']

// Preview calculado en el cliente con lo que ya está cargado en pantalla.
// No persiste nada ni toca la tabla `cierres` — eso solo pasa al llamar
// cerrar_dia(), que es el snapshot real y definitivo del día.
export function ResumenDelDia({
  ventas,
  gastos,
  cajaInicial,
}: {
  ventas: Venta[]
  gastos: Gasto[]
  cajaInicial: number | null
}) {
  const totalesPorMedio = calcularTotalesPorMedio(ventas)
  const medios = Object.keys(totalesPorMedio).sort()
  const totalVentas = ventas.reduce((a, v) => a + v.monto + (v.monto_2 ?? 0), 0)
  // Los gastos quedan solo como registro/referencia — no se restan de nada.
  const totalGastos = gastos.reduce((a, g) => a + g.monto, 0)
  const gananciaNeta = totalVentas

  return (
    <div className="resumen-dia">
      <h2>Resumen de hoy</h2>

      {cajaInicial != null && (
        <p className="caja-inicial-badge">Caja inicial: {formatMonto(cajaInicial)}</p>
      )}

      {medios.length > 0 && (
        <dl className="resumen-desglose">
          {medios.map((m) => (
            <Fragment key={m}>
              <dt>{m}</dt>
              <dd>{formatMonto(totalesPorMedio[m])}</dd>
            </Fragment>
          ))}
        </dl>
      )}

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
