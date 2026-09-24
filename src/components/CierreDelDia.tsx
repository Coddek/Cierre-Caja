import { Fragment, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatMonto } from '../lib/format'
import { mensajeError } from '../lib/errors'
import { calcularTotalesPorMedio } from '../lib/totalesPorMedio'
import { ConfirmDialog } from './ConfirmDialog'
import type { CierreConEditor } from '../lib/types'
import type { Database } from '../lib/database.types'

type Venta = Database['public']['Tables']['ventas']['Row']

export function CierreDelDia({
  fecha,
  cierre,
  ventas,
}: {
  fecha: string
  cierre: CierreConEditor | null
  ventas: Venta[]
}) {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pidiendoCajaFinal, setPidiendoCajaFinal] = useState(false)
  const [cajaFinal, setCajaFinal] = useState('')
  const [confirmandoReabrir, setConfirmandoReabrir] = useState(false)

  async function handleCerrar() {
    const monto = Number(cajaFinal)
    if (cajaFinal.trim() === '' || monto < 0) {
      setError('Ingresá cuánto contaste en la caja (puede ser 0).')
      return
    }
    setWorking(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('cerrar_dia', { p_fecha: fecha, p_caja_final: monto })
    setWorking(false)
    if (rpcError) {
      setError(mensajeError(rpcError))
      return
    }
    setPidiendoCajaFinal(false)
    setCajaFinal('')
  }

  async function handleReabrir() {
    setConfirmandoReabrir(false)
    setWorking(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('reabrir_dia', { p_fecha: fecha })
    setWorking(false)
    if (rpcError) setError(mensajeError(rpcError))
  }

  if (!cierre || !cierre.cerrado) {
    const efectivoCargado = calcularTotalesPorMedio(ventas)['Efectivo'] ?? 0
    const cajaInicial = cierre?.caja_inicial ?? 0
    const esperadoEnCaja = cajaInicial + efectivoCargado

    return (
      <div className="cierre-dia">
        {!pidiendoCajaFinal ? (
          <button type="button" onClick={() => setPidiendoCajaFinal(true)}>
            Cerrar el día
          </button>
        ) : (
          <div className="pedir-caja-final">
            <p className="caja-esperada-nota">
              Según lo cargado hoy, en la caja debería haber{' '}
              <strong>{formatMonto(esperadoEnCaja)}</strong> en efectivo (caja inicial{' '}
              {formatMonto(cajaInicial)} + ventas en efectivo {formatMonto(efectivoCargado)}). Contá la
              plata real de la caja y poné cuánto da abajo — si no coincide, es una señal de que algo no
              se cargó bien (o de un error al dar vuelto).
            </p>
            <label className="campo-monto">
              <span>¿Cuánto contaste en la caja?</span>
              <div className="input-monto-wrap">
                <span className="input-monto-simbolo">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={cajaFinal}
                  onChange={(e) => setCajaFinal(e.target.value)}
                  autoFocus
                />
              </div>
            </label>
            {error && <p className="mensaje-error">{error}</p>}
            <div className="item-acciones">
              <button type="button" onClick={handleCerrar} disabled={working}>
                {working ? 'Cerrando...' : 'Confirmar cierre'}
              </button>
              <button type="button" onClick={() => setPidiendoCajaFinal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const totalesPorMedio = (cierre.totales_por_medio ?? {}) as Record<string, number>
  const medios = Object.keys(totalesPorMedio).sort()
  const efectivoVentas = totalesPorMedio['Efectivo'] ?? 0
  const esperadoEnCajaFinal = (cierre.caja_inicial ?? 0) + efectivoVentas
  const coincide = Math.abs(esperadoEnCajaFinal - (cierre.caja_final ?? 0)) < 0.01

  return (
    <div className="cierre-dia cierre-dia--cerrado">
      <div className="sello-cerrado">Cerrado</div>
      <span className="ganancia-hero-label">Ganancia neta</span>
      <span className="ganancia-hero">{formatMonto(cierre.ganancia_neta)}</span>

      {cierre.reabierto_en && (
        <p className="editado-badge">
          ✎ Editado el{' '}
          {new Date(cierre.reabierto_en).toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
          {cierre.usuarios_caja && ` por ${cierre.usuarios_caja.nombre}`}
        </p>
      )}

      <dl>
        {medios.map((m) => (
          <Fragment key={m}>
            <dt>{m}</dt>
            <dd>{formatMonto(totalesPorMedio[m])}</dd>
          </Fragment>
        ))}

        <dt>Total ventas</dt>
        <dd>{formatMonto(cierre.total_ventas)}</dd>

        <dt>Total gastos</dt>
        <dd>{formatMonto(cierre.total_gastos)}</dd>
      </dl>

      <dl className="arqueo-caja">
        <dt>Caja inicial</dt>
        <dd>{formatMonto(cierre.caja_inicial ?? 0)}</dd>

        <dt>Efectivo esperado</dt>
        <dd>{formatMonto(esperadoEnCajaFinal)}</dd>

        <dt>Caja final (contada)</dt>
        <dd>{formatMonto(cierre.caja_final ?? 0)}</dd>

        <dt>Ganancia en efectivo</dt>
        <dd>{formatMonto(cierre.diferencia_caja ?? 0)}</dd>
      </dl>

      <p className={coincide ? 'caja-coincide' : 'caja-no-coincide'}>
        {coincide ? '✓ La caja coincide con lo esperado' : '⚠ La caja no coincide con lo esperado'}
      </p>

      {error && <p className="mensaje-error">{error}</p>}
      <button type="button" onClick={() => setConfirmandoReabrir(true)} disabled={working}>
        {working ? 'Reabriendo...' : 'Reabrir día'}
      </button>
      {confirmandoReabrir && (
        <ConfirmDialog
          mensaje="¿Reabrir el día para corregir algo?"
          confirmarTexto="Reabrir"
          onConfirm={handleReabrir}
          onCancel={() => setConfirmandoReabrir(false)}
        />
      )}
    </div>
  )
}
