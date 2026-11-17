/**
 * Pares de zapatos vendidos en una venta (se escanean desde "Agregar venta").
 * El stock vive en las tablas de la tienda (tienda-martin/supabase/tienda.sql):
 * al guardar la venta con tienda_registrar_venta se descuenta cada par.
 */

/** Un talle de un color, como lo devuelven tienda_buscar_codigo / tienda_buscar_modelos. */
export type TalleTienda = { id: string; talle: number; talle_br: number | null; stock: number }

/** Un modelo + color encontrado (por código o por búsqueda manual). */
export type ParEncontrado = {
  codigo: string | null
  /** El talle exacto del código (si el código es de un solo talle). */
  talle_id: string | null
  producto: string
  ref: string
  precio: number
  color: string
  foto_path: string | null
  talles: TalleTienda[]
}

/** Un par ya elegido para la venta. */
export type ParVendido = {
  talleId: string
  producto: string
  color: string
  talle: number
  precio: number
  /** El sistema lo tenía en 0: se vende igual y queda marcado para revisar. */
  sinStock: boolean
}

/** Arma el par a partir de lo encontrado y el talle elegido. */
export function elegirPar(encontrado: ParEncontrado, talleId: string): ParVendido | null {
  const talle = encontrado.talles.find((t) => t.id === talleId)
  if (!talle) return null
  return {
    talleId: talle.id,
    producto: encontrado.producto,
    color: encontrado.color,
    talle: talle.talle,
    precio: encontrado.precio,
    sinStock: talle.stock <= 0,
  }
}

export const sumaPares = (pares: ParVendido[]) => pares.reduce((total, par) => total + par.precio, 0)

/** "Sandalia Paris Negro 01 T37, Pelica Negro 01 T39": va como descripción de la venta. */
export const descripcionPares = (pares: ParVendido[]) =>
  pares.map((par) => `${par.producto} ${par.color} T${par.talle}`).join(', ')

/** Normaliza la respuesta (JSON) de las funciones de búsqueda. */
export function leerEncontrados(json: unknown): ParEncontrado[] {
  const filas = Array.isArray(json) ? json : json ? [json] : []
  return filas.filter(
    (f): f is ParEncontrado =>
      typeof f === 'object' && f !== null && 'producto' in f && Array.isArray((f as ParEncontrado).talles),
  )
}
