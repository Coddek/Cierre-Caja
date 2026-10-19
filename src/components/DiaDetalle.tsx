import { useCallback, useState } from 'react'
import { useDiaCompleto } from '../hooks/useDiaCompleto'
import { supabase } from '../lib/supabase'
import { mensajeError } from '../lib/errors'
import { avisoCajaInicial } from '../lib/avisoCajaInicial'
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
import { ConfirmDialog } from './ConfirmDialog'
import { CorregirDia } from './CorregirDia'
import { DesgloseCuentas } from './DesgloseCuentas'
import { SkeletonResumen } from './SkeletonLista'

function fechaCorta(fecha: string) {
  const [yyyy, mm, dd] = fecha.split('-')
  return `${dd}/${mm}/${yyyy}`
}

// Un día cualquiera: totales, cada venta con su hora y la comparación con el
// mismo día de la semana del año anterior. Un día anterior cerrado se puede
// reabrir acá mismo para corregirlo; mientras esté abierto se muestra para
// editar (CorregirDia).
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
  const [recarga, setRecarga] = useState(0)
  const { ventas, gastos, cierre, anterior: cierreAnterior, loading } = useDiaCompleto(fecha, recarga)
  const [confirmandoCorregir, setConfirmandoCorregir] = useState(false)
  const [reabriendo, setReabriendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const volverALeer = useCallback(() => setRecarga((n) => n + 1), [])

  async function handleCorregir() {
    setConfirmandoCorregir(false)
    setReabriendo(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('reabrir_dia', { p_fecha: fecha })
    setReabriendo(false)
    if (rpcError) {
      setError(mensajeError(rpcError))
      return
    }
    volverALeer()
  }

  const fechaAnterior = mismoDiaAnioAnterior(fecha)
  const anterior = cierres.find((c) => c.fecha === fechaAnterior)
  const nombreDia = DIAS_SEMANA[diaDeSemana(fecha)].toLowerCase()
  const cerrado = cierre?.cerrado ?? false
  // El día de hoy se corrige desde la pestaña Hoy.
  const corrigiendo = !!cierre && !cerrado && fecha < hoy
  const avisoInicial = cierre ? avisoCajaInicial(cierre.caja_inicial, cierreAnterior) : null
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
      ) : corrigiendo ? (
        <CorregirDia key={fecha} fecha={fecha} onCerrado={volverALeer} />
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

          {avisoInicial && <p className="caja-no-coincide">{avisoInicial}</p>}

          {cerrado && fecha < hoy && (
            <>
              {error && <p className="mensaje-error">{error}</p>}
              <button
                type="button"
                className="dia-detalle-corregir"
                onClick={() => setConfirmandoCorregir(true)}
                disabled={reabriendo}
              >
                {reabriendo ? 'Reabriendo...' : 'Corregir este día'}
              </button>
            </>
          )}
          {confirmandoCorregir && (
            <ConfirmDialog
              mensaje="¿Reabrir este día para corregirlo? Cuando termines, volvé a confirmar el cierre."
              confirmarTexto="Reabrir"
              onConfirm={handleCorregir}
              onCancel={() => setConfirmandoCorregir(false)}
            />
          )}
        </>
      )}
    </div>
  )
}
