import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatMonto } from '../lib/format'
import { mensajeError } from '../lib/errors'
import { ConfirmDialog } from './ConfirmDialog'
import type { Database } from '../lib/database.types'

type Venta = Database['public']['Tables']['ventas']['Row']
const MEDIOS_PAGO = ['efectivo', 'transferencia', 'tarjeta'] as const
type MedioPago = (typeof MEDIOS_PAGO)[number]

export function VentaItem({ venta }: { venta: Venta }) {
  const [editing, setEditing] = useState(false)
  const [monto, setMonto] = useState(String(venta.monto))
  const [medioPago, setMedioPago] = useState<MedioPago>(venta.medio_pago as MedioPago)
  const [descripcion, setDescripcion] = useState(venta.descripcion ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)

  async function handleGuardar() {
    const montoNum = Number(monto)
    if (!montoNum || montoNum <= 0) {
      setError('Monto inválido.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('ventas')
      .update({ monto: montoNum, medio_pago: medioPago, descripcion: descripcion.trim() || null })
      .eq('id', venta.id)
    setSaving(false)
    if (updateError) {
      setError(mensajeError(updateError))
      return
    }
    setEditing(false)
  }

  async function handleBorrar() {
    setConfirmandoBorrado(false)
    const { error: deleteError } = await supabase.from('ventas').delete().eq('id', venta.id)
    if (deleteError) setError(mensajeError(deleteError))
  }

  if (editing) {
    return (
      <li className="item-editando">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
        <select value={medioPago} onChange={(e) => setMedioPago(e.target.value as MedioPago)}>
          {MEDIOS_PAGO.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Descripción"
        />
        {error && <p className="mensaje-error">{error}</p>}
        <div className="item-acciones">
          <button type="button" onClick={handleGuardar} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="item-movimiento">
      <div className="item-principal">
        <span className="item-monto">{formatMonto(venta.monto)}</span>
        {venta.descripcion && <span className="item-descripcion">{venta.descripcion}</span>}
      </div>
      <div className="item-lateral">
        <span className={`tag tag--${venta.medio_pago}`}>{venta.medio_pago}</span>
        <div className="item-acciones">
          <button type="button" className="link-accion" onClick={() => setEditing(true)}>
            Editar
          </button>
          <button
            type="button"
            className="link-accion link-accion--borrar"
            onClick={() => setConfirmandoBorrado(true)}
          >
            Borrar
          </button>
        </div>
      </div>
      {error && <p className="mensaje-error">{error}</p>}
      {confirmandoBorrado && (
        <ConfirmDialog
          mensaje="¿Borrar esta venta?"
          confirmarTexto="Borrar"
          destructivo
          onConfirm={handleBorrar}
          onCancel={() => setConfirmandoBorrado(false)}
        />
      )}
    </li>
  )
}
