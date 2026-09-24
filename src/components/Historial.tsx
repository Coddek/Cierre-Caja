import { useCierres } from '../hooks/useCierres'
import { formatMonto } from '../lib/format'
import { SkeletonLista } from './SkeletonLista'
import type { CierreConEditor } from '../lib/types'

type ResumenMes = {
  totalVentas: number
  totalGastos: number
  dias: number
}

function agruparPorMes(cierres: CierreConEditor[]): [string, ResumenMes][] {
  const meses = new Map<string, ResumenMes>()
  for (const c of cierres) {
    const mes = c.fecha.slice(0, 7) // "YYYY-MM"
    const actual = meses.get(mes) ?? { totalVentas: 0, totalGastos: 0, dias: 0 }
    actual.totalVentas += c.total_ventas
    actual.totalGastos += c.total_gastos
    actual.dias += 1
    meses.set(mes, actual)
  }
  return [...meses.entries()].sort((a, b) => b[0].localeCompare(a[0]))
}

function formatMes(mes: string) {
  const [year, month] = mes.split('-').map(Number)
  const label = new Date(year, month - 1, 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function Historial() {
  const { cierres, loading } = useCierres()

  if (loading) {
    return (
      <div className="historial">
        <section>
          <h2>Resumen mensual</h2>
          <SkeletonLista filas={2} />
        </section>
      </div>
    )
  }

  const meses = agruparPorMes(cierres)

  return (
    <div className="historial">
      <section>
        <h2>Resumen mensual</h2>
        {meses.length === 0 ? (
          <p>Todavía no hay cierres.</p>
        ) : (
          <ul className="meses-list">
            {meses.map(([mes, r]) => (
              <li key={mes} className="mes-card">
                <div className="mes-header">
                  <span className="mes-nombre">{formatMes(mes)}</span>
                  <span className="mes-dias">
                    {r.dias} día{r.dias !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="stats-row">
                  <div className="stat">
                    <span className="stat-label">Gastos</span>
                    <span className="stat-valor">{formatMonto(r.totalGastos)}</span>
                  </div>
                  <div className="stat stat--destacado">
                    <span className="stat-label">Ventas</span>
                    <span className="stat-valor">{formatMonto(r.totalVentas)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Cierres por día</h2>
        {cierres.length === 0 ? (
          <p>Todavía no hay cierres.</p>
        ) : (
          <ul className="dias-list">
            {cierres.map((c) => (
              <li key={c.id} className="dia-card">
                <div className="dia-header">
                  <span className="dia-fecha">{c.fecha}</span>
                  <span className="dia-ganancia">{formatMonto(c.total_ventas)}</span>
                </div>
                {c.reabierto_en && (
                  <p className="editado-badge">
                    ✎ Editado el{' '}
                    {new Date(c.reabierto_en).toLocaleString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {c.usuarios_caja && ` por ${c.usuarios_caja.nombre}`}
                  </p>
                )}
                <div className="stats-row stats-row--compacto">
                  {Object.entries((c.totales_por_medio ?? {}) as Record<string, number>)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([medio, total]) => (
                      <div className="stat" key={medio}>
                        <span className="stat-label">{medio}</span>
                        <span className="stat-valor">{formatMonto(total)}</span>
                      </div>
                    ))}
                  <div className="stat">
                    <span className="stat-label">Gastos</span>
                    <span className="stat-valor">{formatMonto(c.total_gastos)}</span>
                  </div>
                  {c.caja_inicial != null && (
                    <div className="stat">
                      <span className="stat-label">Caja inicial</span>
                      <span className="stat-valor">{formatMonto(c.caja_inicial)}</span>
                    </div>
                  )}
                  {c.retiro != null && (
                    <div className="stat">
                      <span className="stat-label">Se retiró</span>
                      <span className="stat-valor">{formatMonto(c.retiro)}</span>
                    </div>
                  )}
                  {c.caja_final != null && (
                    <div className="stat">
                      <span className="stat-label">Quedó en caja</span>
                      <span className="stat-valor">{formatMonto(c.caja_final)}</span>
                    </div>
                  )}
                </div>
                {c.retiro != null && Math.abs(c.diferencia_caja ?? 0) >= 0.01 && (
                  <p className="caja-no-coincide">
                    {(c.diferencia_caja ?? 0) < 0
                      ? `⚠ Faltaron ${formatMonto(-(c.diferencia_caja ?? 0))} en la caja`
                      : `⚠ Sobraron ${formatMonto(c.diferencia_caja ?? 0)} en la caja`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
