import { useState, type ReactNode } from 'react'

export type Columna = {
  etiqueta: string // debajo de la columna (ej. "sep", "Sáb", "14")
  valor: number | null
  valor2?: number | null // segunda serie opcional (ej. año anterior), va a la izquierda
}

// Escala "linda" para el eje: 0, mitad y un tope redondo (ej. 0 / 250 mil / 500 mil).
function topeRedondo(max: number) {
  if (max <= 0) return 1
  const base = 10 ** Math.floor(Math.log10(max))
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (m * base >= max) return m * base
  }
  return 10 * base
}

// Columna con la punta redondeada (4px) y la base recta, apoyada en el eje.
function columna(x: number, y: number, ancho: number, alto: number) {
  const r = Math.min(4, ancho / 2, alto)
  return `M${x},${y + alto} V${y + r} Q${x},${y} ${x + r},${y} H${x + ancho - r} Q${x + ancho},${y} ${x + ancho},${y + r} V${y + alto} Z`
}

const W = 340
const H = 170
const IZQ = 46 // lugar para los montos del eje
const ABAJO = 22 // lugar para las etiquetas
const ARRIBA = 8

// Gráfico de columnas en SVG, sin librerías. Tocar (o pasar el mouse por) una
// columna muestra su valor exacto arriba del gráfico, porque el eje solo da
// montos redondeados. "Ver en tabla" muestra todos los valores como texto.
export function GraficoColumnas({
  columnas,
  colores,
  formatoEje,
  lectura,
  tabla,
  titulo,
  etiquetasCada = 1,
}: {
  columnas: Columna[]
  colores: [string] | [string, string] // [serie] o [serie, serie2]
  formatoEje: (n: number) => string
  lectura: (i: number) => ReactNode
  tabla: { encabezados: string[]; filas: string[][] }
  titulo: string
  etiquetasCada?: number
}) {
  const ultimaConDatos = columnas.reduce((a, c, i) => (c.valor != null ? i : a), columnas.length - 1)
  const [elegida, setElegida] = useState(ultimaConDatos)

  const dosSeries = colores.length === 2
  const max = topeRedondo(Math.max(0, ...columnas.flatMap((c) => [c.valor ?? 0, c.valor2 ?? 0])))
  const altoPlot = H - ABAJO - ARRIBA
  const banda = (W - IZQ) / columnas.length
  const ancho = Math.min(24, dosSeries ? (banda * 0.75 - 2) / 2 : banda * 0.6)
  const y = (v: number) => ARRIBA + altoPlot - (v / max) * altoPlot

  return (
    <div className="grafico">
      <p className="grafico-lectura" aria-live="polite">
        {lectura(elegida)}
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} className="grafico-svg" role="img" aria-label={titulo}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={IZQ} x2={W} y1={y(max * f)} y2={y(max * f)} className={f === 0 ? 'grafico-base' : 'grafico-grilla'} />
            <text x={IZQ - 6} y={y(max * f)} className="grafico-eje" textAnchor="end" dominantBaseline="middle">
              {formatoEje(max * f)}
            </text>
          </g>
        ))}

        {columnas.map((c, i) => {
          const x0 = IZQ + i * banda
          const centro = x0 + banda / 2
          const xa = dosSeries ? centro - ancho - 1 : centro - ancho / 2
          const xb = centro + 1
          return (
            <g key={i}>
              {i === elegida && <rect x={x0} y={ARRIBA} width={banda} height={altoPlot} className="grafico-elegida" />}
              {dosSeries && c.valor2 != null && c.valor2 > 0 && (
                <path d={columna(xa, y(c.valor2), ancho, y(0) - y(c.valor2))} fill={colores[1]} />
              )}
              {c.valor != null && c.valor > 0 && (
                <path d={columna(dosSeries ? xb : xa, y(c.valor), ancho, y(0) - y(c.valor))} fill={colores[0]} />
              )}
              {i % etiquetasCada === 0 && (
                <text x={centro} y={H - 6} className="grafico-eje" textAnchor="middle">
                  {c.etiqueta}
                </text>
              )}
              {/* Zona de toque: toda la banda, más grande que la columna */}
              <rect
                x={x0}
                y={0}
                width={banda}
                height={H}
                fill="transparent"
                onMouseEnter={() => setElegida(i)}
                onClick={() => setElegida(i)}
              />
            </g>
          )
        })}
      </svg>

      <details className="grafico-tabla">
        <summary>Ver en tabla</summary>
        <table>
          <thead>
            <tr>
              {tabla.encabezados.map((e) => (
                <th key={e}>{e}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabla.filas.map((f, i) => (
              <tr key={i}>
                {f.map((celda, j) => (
                  <td key={j}>{celda}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
