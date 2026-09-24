import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Config editable desde el Table Editor (tabla `medios_pago`), sin tocar código.
export function useMediosPago() {
  const [medios, setMedios] = useState<string[]>([])

  useEffect(() => {
    supabase
      .from('medios_pago')
      .select('nombre')
      .eq('activo', true)
      .order('orden')
      .then(({ data }) => setMedios((data ?? []).map((m) => m.nombre)))
  }, [])

  return medios
}
