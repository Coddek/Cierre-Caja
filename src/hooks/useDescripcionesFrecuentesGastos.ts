import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Mira los últimos gastos cargados y arma una lista corta de descripciones
// frecuentes (más usadas primero) para no tener que tipear siempre lo mismo
// ("mercadería", "luz", "alquiler"...). No hace falta una tabla ni función
// nueva: son datos que ya tenemos en `gastos`.
export function useDescripcionesFrecuentesGastos() {
  const [descripciones, setDescripciones] = useState<string[]>([])

  useEffect(() => {
    supabase
      .from('gastos')
      .select('descripcion')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (!data) return
        const conteo = new Map<string, number>()
        for (const { descripcion } of data) {
          conteo.set(descripcion, (conteo.get(descripcion) ?? 0) + 1)
        }
        const top = [...conteo.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([descripcion]) => descripcion)
        setDescripciones(top)
      })
  }, [])

  return descripciones
}
