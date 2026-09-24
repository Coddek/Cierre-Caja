import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatMonto } from '../lib/format'
import { mensajeError } from '../lib/errors'
import { ConfirmDialog } from './ConfirmDialog'
import type { Database } from '../lib/database.types'

type Gasto = Database['public']['Tables']['gastos']['Row']

export function GastoItem({ gasto }: { gasto: Gasto }) {
  const [editing, setEditing] = useState(false)
  const [monto, setMonto] = useState(String(gasto.monto))
  const [descripcion, setDescripcion] = useState(gasto.descripcion)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)

  async function handleGuardar() {
    const montoNum = Number(monto)
    if (!montoNum || montoNum <= 0) {
      setError('Monto inválido.')
      return
    }
    if (!descripcion.trim()) {
      setError('La descripción es obligatoria.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('gastos')
      .update({ monto: montoNum, descripcion: descripcion.trim() })
      .eq('id', gasto.id)
    setSaving(false)
    if (updateError) {
      setError(mensajeError(updateError))
      return
    }
    setEditing(false)
  }

  async function handleBorrar() {
    setConfirmandoBorrado(false)
    const { error: deleteError } = await supabase.from('gastos').delete().eq('id', gasto.id)
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
        <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
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
        <span className="item-monto">{formatMonto(gasto.monto)}</span>
        <span className="item-descripcion">{gasto.descripcion}</span>
      </div>
      <div className="item-lateral">
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
          mensaje="¿Borrar este gasto?"
          confirmarTexto="Borrar"
          destructivo
          onConfirm={handleBorrar}
          onCancel={() => setConfirmandoBorrado(false)}
        />
      )}
    </li>
  )
}
