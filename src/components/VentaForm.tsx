import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { mensajeError } from '../lib/errors'
import { useMediosPago } from '../hooks/useMediosPago'
import { useMarcas } from '../hooks/useMarcas'
import { MarcaInput } from './MarcaInput'

export function VentaForm({ fecha, onSuccess }: { fecha: string; onSuccess: () => void }) {
  const medios = useMediosPago()
  const marcas = useMarcas()

  const [monto, setMonto] = useState('')
  const [medioPago, setMedioPago] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [dividido, setDividido] = useState(false)
  const [medioPago2, setMedioPago2] = useState('')
  const [monto2, setMonto2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const medioPagoActual = medioPago || medios[0] || ''

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const montoNum = Number(monto)
    if (!montoNum || montoNum <= 0) {
      setError('Ingresá un monto válido.')
      return
    }
    if (!medioPagoActual) {
      setError('Elegí un medio de pago.')
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
    const { error: insertError } = await supabase.from('ventas').insert({
      fecha,
      monto: montoNum,
      medio_pago: medioPagoActual,
      descripcion: descripcion.trim() || null,
      medio_pago_2: dividido ? medioPago2 : null,
      monto_2: dividido ? montoNum2 : null,
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
    setDividido(false)
    setMedioPago2('')
    setMonto2('')
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

      <label>
        <span>Medio de pago</span>
        <select value={medioPagoActual} onChange={(e) => setMedioPago(e.target.value)}>
          {medios.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      <label className="campo-checkbox">
        <input type="checkbox" checked={dividido} onChange={(e) => setDividido(e.target.checked)} />
        <span>Pagó con 2 medios distintos</span>
      </label>

      {dividido && (
        <div className="campo-pago-dividido">
          <label>
            <span>Segundo medio de pago</span>
            <select value={medioPago2} onChange={(e) => setMedioPago2(e.target.value)}>
              <option value="">Elegir...</option>
              {medios.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Monto del segundo pago</span>
            <div className="input-monto-wrap">
              <span className="input-monto-simbolo">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0"
                value={monto2}
                onChange={(e) => setMonto2(e.target.value)}
              />
            </div>
          </label>
        </div>
      )}

      <label>
        <span>Descripción (opcional)</span>
        <MarcaInput
          value={descripcion}
          onChange={setDescripcion}
          opciones={marcas}
          placeholder="Marca, seña, lo que sea..."
        />
      </label>

      {error && <p className="mensaje-error">{error}</p>}

      <button type="submit" disabled={saving}>
        {saving ? 'Guardando...' : 'Agregar venta'}
      </button>
    </form>
  )
}
