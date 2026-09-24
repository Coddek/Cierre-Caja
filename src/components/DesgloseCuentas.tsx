import type { Database } from '../lib/database.types'
import { formatMonto } from '../lib/format'
import { MEDIO_EFECTIVO, calcularEfectivoEsperado, ordenarMedios, pagosPorMedio } from '../lib/totalesPorMedio'

type Venta = Database['public']['Tables']['ventas']['Row']
type Gasto = Database['public']['Tables']['gastos']['Row']

// Muestra renglón por renglón qué está sumando la app en cada cuenta, igual
// que en el cuaderno del local, para poder revisarlo contra la hoja y
// detectar si algo se cargó mal.
export function DesgloseCuentas({
  ventas,
  gastos,
  cajaInicial,
}: {
  ventas: Venta[]
  gastos: Gasto[]
  cajaInicial: number
}) {
  const pagos = pagosPorMedio(ventas)
  const medios = ordenarMedios(Object.keys(pagos))
  const totalDe = (medio: string) => pagos[medio].reduce((a, p) => a + p.monto, 0)
  const totalVentas = medios.reduce((a, m) => a + totalDe(m), 0)
  const efectivoVentas = pagos[MEDIO_EFECTIVO] ? totalDe(MEDIO_EFECTIVO) : 0
  const esperado = calcularEfectivoEsperado(ventas, gastos, cajaInicial)

  return (
    <div className="desglose">
      {medios.length === 0 && <p className="desglose-vacio">Todavía no hay ventas cargadas.</p>}

      {medios.map((m) => (
        <details key={m} className="desglose-cuenta">
          <summary>
            <span>
              {m} <span className="desglose-cantidad">({pagos[m].length})</span>
            </span>
            <strong>{formatMonto(totalDe(m))}</strong>
          </summary>
          <ul>
            {pagos[m].map((p) => (
              <li key={`${p.ventaId}-${m}`}>
                <span>
                  {p.descripcion || <em>sin descripción</em>}
                  {p.dividido && (
                    <span className="desglose-nota">
                      {' '}
                      · parte de {formatMonto(p.dividido.totalVenta)}, el resto en {p.dividido.otroMedio}
                    </span>
                  )}
                </span>
                <span>{formatMonto(p.monto)}</span>
              </li>
            ))}
          </ul>
        </details>
      ))}

      {medios.length > 0 && (
        <div className="desglose-cuenta desglose-cuenta--abierta">
          <h3>Total de ventas</h3>
          <ul>
            {medios.map((m) => (
              <li key={m}>
                <span>{m}</span>
                <span>{formatMonto(totalDe(m))}</span>
              </li>
            ))}
          </ul>
          <p className="desglose-resultado">
            <span>Total</span>
            <strong>{formatMonto(totalVentas)}</strong>
          </p>
        </div>
      )}

      <div className="desglose-cuenta desglose-cuenta--abierta">
        <h3>Cuenta del efectivo</h3>
        <ul>
          <li>
            <span>Caja inicial</span>
            <span>+ {formatMonto(cajaInicial)}</span>
          </li>
          <li>
            <span>Ventas en efectivo</span>
            <span>+ {formatMonto(efectivoVentas)}</span>
          </li>
          {gastos.map((g) => (
            <li key={g.id}>
              <span>Gasto: {g.descripcion}</span>
              <span>− {formatMonto(g.monto)}</span>
            </li>
          ))}
        </ul>
        <p className="desglose-resultado">
          <span>Tiene que haber en la caja</span>
          <strong>{formatMonto(esperado)}</strong>
        </p>
      </div>
    </div>
  )
}

