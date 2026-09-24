import { Fragment } from 'react'
import type { Database } from '../lib/database.types'
import { formatMonto } from '../lib/format'
import { calcularTotalesPorMedio, ordenarMedios } from '../lib/totalesPorMedio'
import { CajaInicialEditable } from './CajaInicialEditable'

type Venta = Database['public']['Tables']['ventas']['Row']
type Gasto = Database['public']['Tables']['gastos']['Row']

// Preview calculado en el cliente con lo que ya está cargado en pantalla.
// No persiste nada ni toca la tabla `cierres` — eso solo pasa al llamar
// cerrar_dia(), que es el snapshot real y definitivo del día.
export function ResumenDelDia({
  fecha,
  ventas,
  gastos,
  cajaInicial,
}: {
  fecha: string
  ventas: Venta[]
  gastos: Gasto[]
  cajaInicial: number | null
}) {
  const totalesPorMedio = calcularTotalesPorMedio(ventas)
  const medios = ordenarMedios(Object.keys(totalesPorMedio))
  const totalVentas = ventas.reduce((a, v) => a + v.monto + (v.monto_2 ?? 0), 0)
  // Los gastos no se restan de las ventas; solo salen del efectivo de la
  // caja (eso se ve en el cierre).
  const totalGastos = gastos.reduce((a, g) => a + g.monto, 0)

  return (
    <div className="resumen-dia">
      <h2>Resumen de hoy</h2>

      {cajaInicial != null && <CajaInicialEditable fecha={fecha} cajaInicial={cajaInicial} />}

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
        <dt>Total gastos</dt>
        <dd>{formatMonto(totalGastos)}</dd>

        <dt className="destacado">Total ventas</dt>
        <dd className="destacado">{formatMonto(totalVentas)}</dd>
      </dl>
    </div>
  )
}
