/**
 * Códigos de barras de las cajas (EAN-13 / EAN-8 / UPC). El último dígito es
 * de control: si no cierra, la lectura o lo tipeado tiene un error.
 * (Misma lógica que el editor de la tienda: tienda-martin/src/lib/ean.ts.)
 */
export function codigoValido(codigo: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(codigo)) return false
  const digitos = codigo.split('').map(Number)
  const control = digitos.pop()!
  // Desde la derecha: pesos 3, 1, 3, 1…
  const suma = digitos.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (suma % 10)) % 10 === control
}

/** Deja solo los dígitos (en la etiqueta vienen separados: "7 900067 313927"). */
export const limpiarCodigo = (valor: string) => valor.replace(/\D/g, '')
