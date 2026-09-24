import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Config editable desde el Table Editor (tabla `marcas`), sin tocar código.
// Se usa como sugerencias en la descripción de la venta (texto libre, no
// una lista cerrada).
export function useMarcas() {
  const [marcas, setMarcas] = useState<string[]>([])

  useEffect(() => {
    supabase
      .from('marcas')
      .select('nombre')
      .eq('activo', true)
      .order('orden')
      .then(({ data }) => setMarcas((data ?? []).map((m) => m.nombre)))
  }, [])

  return marcas
}
