import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatMonto } from '../lib/format'
import { mensajeError } from '../lib/errors'
import { ConfirmDialog } from './ConfirmDialog'
import { useMediosPago } from '../hooks/useMediosPago'
import { useMarcas } from '../hooks/useMarcas'
import { MarcaInput } from './MarcaInput'
import type { Database } from '../lib/database.types'

type Venta = Database['public']['Tables']['ventas']['Row']

export function VentaItem({ venta }: { venta: Venta }) {
  const medios = useMediosPago()
  const marcas = useMarcas()

  const [editing, setEditing] = useState(false)
  const [monto, setMonto] = useState(String(venta.monto))
  const [medioPago, setMedioPago] = useState(venta.medio_pago)
  const [descripcion, setDescripcion] = useState(venta.descripcion ?? '')
  const [dividido, setDividido] = useState(!!venta.medio_pago_2)
  const [medioPago2, setMedioPago2] = useState(venta.medio_pago_2 ?? '')
  const [monto2, setMonto2] = useState(venta.monto_2 != null ? String(venta.monto_2) : '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)

  async function handleGuardar() {
    const montoNum = Number(monto)
    if (!montoNum || montoNum <= 0) {
      setError('Monto inválido.')
      return
    }

    let montoNum2: number | null = null
    if (dividido) {
      montoNum2 = Number(monto2)
      if (!medioPago2) {
        setError('Elegí el segundo medio de pago.')
        return
      }
      if (!montoNum2 || montoNum2 <= 0) {
        setError('Ingresá el monto del segundo pago.')
        return
      }
    }

    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('ventas')
      .update({
        monto: montoNum,
        medio_pago: medioPago,
        descripcion: descripcion.trim() || null,
        medio_pago_2: dividido ? medioPago2 : null,
        monto_2: dividido ? montoNum2 : null,
      })
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
        <select value={medioPago} onChange={(e) => setMedioPago(e.target.value)}>
          {medios.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <label className="campo-checkbox">
          <input type="checkbox" checked={dividido} onChange={(e) => setDividido(e.target.checked)} />
          <span>Pagó con 2 medios distintos</span>
        </label>

        {dividido && (
          <div className="campo-pago-dividido">
            <select value={medioPago2} onChange={(e) => setMedioPago2(e.target.value)}>
              <option value="">Elegir...</option>
              {medios.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="Monto del segundo pago"
              value={monto2}
              onChange={(e) => setMonto2(e.target.value)}
            />
          </div>
        )}

        <MarcaInput value={descripcion} onChange={setDescripcion} opciones={marcas} placeholder="Descripción" />

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
        <span className="tag">{venta.medio_pago}</span>
        {venta.medio_pago_2 && (
          <span className="tag">
            {venta.medio_pago_2} {formatMonto(venta.monto_2 ?? 0)}
          </span>
        )}
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
