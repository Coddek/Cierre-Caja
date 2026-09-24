import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { mensajeError } from '../lib/errors'

const MEDIOS_PAGO = ['efectivo', 'transferencia', 'tarjeta'] as const
type MedioPago = (typeof MEDIOS_PAGO)[number]

export function VentaForm({ fecha, onSuccess }: { fecha: string; onSuccess: () => void }) {
  const [monto, setMonto] = useState('')
  const [medioPago, setMedioPago] = useState<MedioPago>('efectivo')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const montoNum = Number(monto)
    if (!montoNum || montoNum <= 0) {
      setError('Ingresá un monto válido.')
      return
    }

    setSaving(true)
    const { error: insertError } = await supabase.from('ventas').insert({
      fecha,
      monto: montoNum,
      medio_pago: medioPago,
      descripcion: descripcion.trim() || null,
    })
    setSaving(false)

    if (insertError) {
      setError(mensajeError(insertError))
      return
    }

    // No hace falta refrescar la lista a mano: la suscripción realtime del
    // hook useVentasHoy va a traer esta venta apenas Postgres confirme el insert.
    setMonto('')
    setDescripcion('')
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="form-carga">
      <label className="campo-monto">
        <span>Monto</span>
        <div className="input-monto-wrap">
          <span className="input-monto-simbolo">$</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />
        </div>
      </label>

      <div className="campo-segmentado">
        <span>Medio de pago</span>
        <div className="segmentado">
          {MEDIOS_PAGO.map((m) => (
            <button
              key={m}
              type="button"
              className={`segmento tag--${m} ${medioPago === m ? 'segmento--activo' : ''}`}
              onClick={() => setMedioPago(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <label>
        <span>Descripción (opcional)</span>
        <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </label>

      {error && <p className="mensaje-error">{error}</p>}

      <button type="submit" disabled={saving}>
        {saving ? 'Guardando...' : 'Agregar venta'}
      </button>
    </form>
  )
}
