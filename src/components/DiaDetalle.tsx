import { useDiaCompleto } from '../hooks/useDiaCompleto'
import { formatMonto } from '../lib/format'
import {
  DIAS_SEMANA,
  formatEntero,
  diaDeSemana,
  fechaLarga,
  mismoDiaAnioAnterior,
  sumarDias,
  type CierreStats,
} from '../lib/estadisticas'
import { DesgloseCuentas } from './DesgloseCuentas'
import { SkeletonResumen } from './SkeletonLista'

function fechaCorta(fecha: string) {
  const [yyyy, mm, dd] = fecha.split('-')
  return `${dd}/${mm}/${yyyy}`
}

// Un día cualquiera, de solo lectura: totales, cada venta con su hora y la
// comparación con el mismo día de la semana del año anterior.
export function DiaDetalle({
  fecha,
  onCambiarFecha,
  cierres,
  hoy,
}: {
  fecha: string
  onCambiarFecha: (fecha: string) => void
  cierres: CierreStats[]
  hoy: string
}) {
  const { ventas, gastos, cierre, loading } = useDiaCompleto(fecha)

  const fechaAnterior = mismoDiaAnioAnterior(fecha)
  const anterior = cierres.find((c) => c.fecha === fechaAnterior)
  const nombreDia = DIAS_SEMANA[diaDeSemana(fecha)].toLowerCase()
  const cerrado = cierre?.cerrado ?? false
  const variacion =
    cerrado && anterior && anterior.total_ventas > 0
      ? ((cierre!.total_ventas - anterior.total_ventas) / anterior.total_ventas) * 100
      : null

  return (
    <div className="dia-detalle">
      <div className="dia-detalle-nav">
        <button type="button" onClick={() => onCambiarFecha(sumarDias(fecha, -1))} aria-label="Día anterior">
          ‹
        </button>
        <input
          type="date"
          value={fecha}
          max={hoy}
          onChange={(e) => e.target.value && onCambiarFecha(e.target.value)}
          aria-label="Elegir día"
        />
        <button
          type="button"
          onClick={() => onCambiarFecha(sumarDias(fecha, 1))}
          disabled={fecha >= hoy}
          aria-label="Día siguiente"
        >
          ›
        </button>
      </div>

      <p className="dia-detalle-fecha">{fechaLarga(fecha)}</p>

      {loading ? (
        <SkeletonResumen />
      ) : !cierre ? (
        <p className="numeros-vacio">Ese día no se abrió la caja.</p>
      ) : (
        <>
          {cerrado ? (
            <>
              <span className="ganancia-hero-label">Total ventas</span>
              <span className="dia-detalle-total">{formatMonto(cierre.total_ventas)}</span>
            </>
          ) : (
            <p className="numeros-vacio">Este día todavía no está cerrado.</p>
          )}

          <p className="dia-detalle-comparacion">
            {anterior ? (
              <>
                Mismo {nombreDia} de {fechaAnterior.slice(0, 4)} ({fechaCorta(fechaAnterior)}):{' '}
                <strong>{formatEntero(anterior.total_ventas)}</strong>
                {variacion != null && (
                  <span className={variacion >= 0 ? 'variacion-sube' : 'variacion-baja'}>
                    {' '}
                    {variacion >= 0 ? '▲' : '▼'} {Math.abs(Math.round(variacion))}%
                  </span>
                )}
              </>
            ) : (
              <>
                Sin datos del mismo {nombreDia} de {fechaAnterior.slice(0, 4)} ({fechaCorta(fechaAnterior)}).
              </>
            )}
          </p>

          <DesgloseCuentas ventas={ventas} gastos={gastos} cajaInicial={cierre.caja_inicial ?? 0} />

          {cerrado && cierre.retiro != null && (
            <p className="dia-detalle-arqueo">
              Se retiró {formatMonto(cierre.retiro)} y quedaron {formatMonto(cierre.caja_final ?? 0)} en la caja
              {Math.abs(cierre.diferencia_caja ?? 0) < 0.01
                ? ' · ✓ coincidió'
                : (cierre.diferencia_caja ?? 0) < 0
                  ? ` · ⚠ faltaron ${formatMonto(-(cierre.diferencia_caja ?? 0))}`
                  : ` · ⚠ sobraron ${formatMonto(cierre.diferencia_caja ?? 0)}`}
            </p>
          )}
        </>
      )}
    </div>
  )
}
