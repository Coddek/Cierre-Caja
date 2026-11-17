import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import {
  captureFrame,
  cleanBarcode,
  GUIDE,
  isValidBarcode,
  shareOrDownload,
  startScanner,
  type ScanDiagnostics,
} from '../lib/barcode-scanner'

/** Después de esto sin leer, se muestran consejos. */
const CONSEJO_DESPUES_MS = 8000

/**
 * Cámara trasera + lectura del código de barras de la caja (motor en
 * src/lib/barcode-scanner.ts, el mismo que el editor de la tienda). Siempre se
 * puede tipear el número de la etiqueta. Con «Diagnóstico» se ve qué pasa
 * adentro y se puede guardar un cuadro de la cámara para revisarlo.
 */
export function Scanner({ onDetectar }: { onDetectar: (codigo: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const lector = useRef<ReturnType<typeof startScanner> | null>(null)
  const [estado, setEstado] = useState<'abriendo' | 'leyendo' | 'lento' | 'error'>('abriendo')
  const [error, setError] = useState<string | null>(null)
  const [tipeado, setTipeado] = useState('')
  const [errorTipeado, setErrorTipeado] = useState<string | null>(null)
  const [verDiag, setVerDiag] = useState(false)
  const [diag, setDiag] = useState<ScanDiagnostics | null>(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (!video.current) return
    let timerConsejo = 0
    const l = startScanner(video.current, {
      onCode: onDetectar,
      onReady: () => {
        setEstado('leyendo')
        timerConsejo = window.setTimeout(() => setEstado((e) => (e === 'leyendo' ? 'lento' : e)), CONSEJO_DESPUES_MS)
      },
      onError: (mensaje) => {
        setError(mensaje)
        setEstado('error')
      },
    })
    lector.current = l
    return () => {
      window.clearTimeout(timerConsejo)
      l.stop()
      lector.current = null
    }
  }, [onDetectar])

  // Mientras el diagnóstico está abierto, se actualiza dos veces por segundo.
  useEffect(() => {
    if (!verDiag) return
    const id = window.setInterval(() => setDiag(lector.current?.diagnostics() ?? null), 500)
    return () => window.clearInterval(id)
  }, [verDiag])

  function usarTipeado(e: SubmitEvent) {
    e.preventDefault()
    const codigo = cleanBarcode(tipeado)
    if (!isValidBarcode(codigo)) {
      setErrorTipeado('Ese número no es válido. Revisalo en la etiqueta (son 13 dígitos).')
      return
    }
    lector.current?.stop()
    onDetectar(codigo)
  }

  const textoDiag = diag
    ? [
        `Lector v${diag.version} · ${diag.reader} · motor: ${diag.engine}`,
        `Cámara: ${diag.camera} · zoom: ${diag.zoom}`,
        `Cuadros analizados: ${diag.frames} · ${diag.msPerFrame} ms c/u`,
        `Lecturas: ${diag.reads.length ? diag.reads.join(', ') : 'ninguna'}`,
        `Último error: ${diag.lastError ?? 'ninguno'}`,
        `Navegador: ${navigator.userAgent}`,
      ].join('\n')
    : 'Cargando…'

  const mensaje =
    estado === 'abriendo'
      ? 'Abriendo la cámara y el lector…'
      : estado === 'leyendo'
        ? 'Poné el código de barras adentro del recuadro, a unos 20–30 cm.'
        : estado === 'lento'
          ? 'Todavía no lee: alejá el celular hasta que el código se vea nítido (de muy cerca no enfoca), con buena luz y sin reflejo. O tipeá los números abajo.'
          : error

  return (
    <div className="scanner">
      <div className="scanner-video">
        <video ref={video} playsInline muted />
        {(estado === 'leyendo' || estado === 'lento') && (
          <div
            className="scanner-guia"
            aria-hidden="true"
            style={{
              left: `${GUIDE.left * 100}%`,
              right: `${(1 - GUIDE.right) * 100}%`,
              top: `${GUIDE.top * 100}%`,
              bottom: `${(1 - GUIDE.bottom) * 100}%`,
            }}
          />
        )}
      </div>
      {/* Debajo del visor, no encima: así no tapa la etiqueta. */}
      <p aria-live="polite" className={estado === 'lento' || estado === 'error' ? 'scanner-estado scanner-estado--aviso' : 'scanner-estado'}>
        {mensaje}
      </p>

      <form onSubmit={usarTipeado} className="scanner-manual">
        <label htmlFor="codigo-manual">¿No lee? Tipeá los números de la etiqueta</label>
        <div className="scanner-manual-fila">
          <input
            id="codigo-manual"
            inputMode="numeric"
            autoComplete="off"
            value={tipeado}
            placeholder="7 900067 313927"
            onChange={(e) => {
              setTipeado(e.target.value)
              setErrorTipeado(null)
            }}
          />
          <button type="submit">Usar</button>
        </div>
        {errorTipeado && <p className="mensaje-error">{errorTipeado}</p>}
      </form>

      <button
        type="button"
        className="scanner-diag-toggle"
        onClick={() => {
          setVerDiag(!verDiag)
          setDiag(lector.current?.diagnostics() ?? null)
        }}
      >
        {verDiag ? 'Ocultar diagnóstico' : '¿No anda? Ver diagnóstico'}
      </button>
      {verDiag && (
        <div className="scanner-diag">
          <pre>{textoDiag}</pre>
          <div className="scanner-diag-acciones">
            <button
              type="button"
              onClick={async () => {
                const blob = video.current ? await captureFrame(video.current) : null
                if (blob) await shareOrDownload(blob, `camara-lector-${Date.now()}.jpg`)
              }}
            >
              Guardar cuadro
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(textoDiag)
                  setCopiado(true)
                  window.setTimeout(() => setCopiado(false), 2000)
                } catch {
                  // sin portapapeles: se puede sacar captura de pantalla
                }
              }}
            >
              {copiado ? 'Copiado ✓' : 'Copiar datos'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
