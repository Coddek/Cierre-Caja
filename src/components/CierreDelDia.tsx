import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatMonto } from '../lib/format'
import { mensajeError } from '../lib/errors'
import { ConfirmDialog } from './ConfirmDialog'
import type { CierreConEditor } from '../lib/types'

export function CierreDelDia({ fecha, cierre }: { fecha: string; cierre: CierreConEditor | null }) {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<'cerrar' | 'reabrir' | null>(null)

  async function handleCerrar() {
    setConfirmando(null)
    setWorking(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('cerrar_dia', { p_fecha: fecha })
    setWorking(false)
    if (rpcError) setError(mensajeError(rpcError))
  }

  async function handleReabrir() {
    setConfirmando(null)
    setWorking(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('reabrir_dia', { p_fecha: fecha })
    setWorking(false)
    if (rpcError) setError(mensajeError(rpcError))
  }

  if (!cierre || !cierre.cerrado) {
    return (
      <div className="cierre-dia">
        {error && <p className="mensaje-error">{error}</p>}
        <button type="button" onClick={() => setConfirmando('cerrar')} disabled={working}>
          {working ? 'Cerrando...' : 'Cerrar el día'}
        </button>
        {confirmando === 'cerrar' && (
          <ConfirmDialog
            mensaje="¿Cerrar el día? No vas a poder cargar más ventas ni gastos hasta reabrirlo."
            confirmarTexto="Cerrar día"
            onConfirm={handleCerrar}
            onCancel={() => setConfirmando(null)}
          />
        )}
      </div>
    )
  }

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
        <dt>Efectivo</dt>
        <dd>{formatMonto(cierre.total_efectivo)}</dd>

        <dt>Transferencia</dt>
        <dd>{formatMonto(cierre.total_transferencia)}</dd>

        <dt>Tarjeta</dt>
        <dd>{formatMonto(cierre.total_tarjeta)}</dd>

        <dt>Total ventas</dt>
        <dd>{formatMonto(cierre.total_ventas)}</dd>

        <dt>Total gastos</dt>
        <dd>{formatMonto(cierre.total_gastos)}</dd>
      </dl>

      {error && <p className="mensaje-error">{error}</p>}
      <button type="button" onClick={() => setConfirmando('reabrir')} disabled={working}>
        {working ? 'Reabriendo...' : 'Reabrir día'}
      </button>
      {confirmando === 'reabrir' && (
        <ConfirmDialog
          mensaje="¿Reabrir el día para corregir algo?"
          confirmarTexto="Reabrir"
          onConfirm={handleReabrir}
          onCancel={() => setConfirmando(null)}
        />
      )}
    </div>
  )
}
