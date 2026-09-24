import { useRef, useState } from 'react'

// Reemplaza <input list=...> + <datalist>: eso usa el autocompletado nativo
// del navegador, que no se puede restylear con CSS en ningún browser. Esto
// es un desplegable propio, armado a mano, para que combine con el resto.
export function MarcaInput({
  value,
  onChange,
  opciones,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  opciones: string[]
  placeholder?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filtradas =
    value.trim() === ''
      ? opciones
      : opciones.filter((o) => o.toLowerCase().includes(value.trim().toLowerCase()))

  function elegir(opcion: string) {
    onChange(opcion)
    setAbierto(false)
  }

  return (
    <div className="marca-input-wrap">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setAbierto(true)}
        onBlur={() => {
          // Delay para que el click en una opción llegue a registrarse antes
          // de que el blur cierre la lista.
          blurTimeout.current = setTimeout(() => setAbierto(false), 150)
        }}
      />
      {abierto && filtradas.length > 0 && (
        <ul className="marca-input-lista">
          {filtradas.map((o) => (
            <li key={o}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  if (blurTimeout.current) clearTimeout(blurTimeout.current)
                  elegir(o)
                }}
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
