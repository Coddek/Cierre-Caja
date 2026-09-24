import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { mensajeError } from '../lib/errors'

export function AbrirDia({ fecha }: { fecha: string }) {
  const [cajaInicial, setCajaInicial] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const monto = Number(cajaInicial)
    if (cajaInicial.trim() === '' || monto < 0) {
      setError('Ingresá un monto válido (puede ser 0).')
      return
    }

    setSaving(true)
    const { error: rpcError } = await supabase.rpc('abrir_dia', { p_fecha: fecha, p_caja_inicial: monto })
    setSaving(false)

    if (rpcError) setError(mensajeError(rpcError))
  }

  return (
    <form onSubmit={handleSubmit} className="form-carga abrir-dia">
      <h2>Arrancar el día</h2>
      <p>¿Con cuánto efectivo abrís la caja hoy (para dar vuelto)?</p>

      <label className="campo-monto">
        <span>Caja inicial</span>
        <div className="input-monto-wrap">
          <span className="input-monto-simbolo">$</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0"
            value={cajaInicial}
            onChange={(e) => setCajaInicial(e.target.value)}
            required
          />
        </div>
      </label>

      {error && <p className="mensaje-error">{error}</p>}

      <button type="submit" disabled={saving}>
        {saving ? 'Guardando...' : 'Empezar el día'}
      </button>
    </form>
  )
}
