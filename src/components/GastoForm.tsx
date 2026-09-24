import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { mensajeError } from '../lib/errors'
import { useDescripcionesFrecuentesGastos } from '../hooks/useDescripcionesFrecuentesGastos'

export function GastoForm({ fecha, onSuccess }: { fecha: string; onSuccess: () => void }) {
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const descripcionesFrecuentes = useDescripcionesFrecuentesGastos()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const montoNum = Number(monto)
    if (!montoNum || montoNum <= 0) {
      setError('Ingresá un monto válido.')
      return
    }
    if (!descripcion.trim()) {
      setError('La descripción es obligatoria para un gasto.')
      return
    }

    setSaving(true)
    const { error: insertError } = await supabase.from('gastos').insert({
      fecha,
      monto: montoNum,
      descripcion: descripcion.trim(),
    })
    setSaving(false)

    if (insertError) {
      setError(mensajeError(insertError))
      return
    }

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

      <label>
        <span>Descripción</span>
        <input
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          required
        />
      </label>

      {descripcionesFrecuentes.length > 0 && (
        <div className="chips-frecuentes">
          {descripcionesFrecuentes.map((d) => (
            <button key={d} type="button" className="chip-frecuente" onClick={() => setDescripcion(d)}>
              {d}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mensaje-error">{error}</p>}

      <button type="submit" disabled={saving}>
        {saving ? 'Guardando...' : 'Agregar gasto'}
      </button>
    </form>
  )
}
