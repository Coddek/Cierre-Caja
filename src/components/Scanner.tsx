import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import { codigoValido, limpiarCodigo } from '../lib/ean'

type Lector = { detect: (fuente: HTMLCanvasElement) => Promise<{ rawValue: string }[]> }

const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

/** Recuadro guía, en fracciones del visor (casi cuadrado: el código de estas cajas va parado). */
const GUIA = { izq: 0.12, der: 0.88, arriba: 0.08, abajo: 0.92 }
/** Lado mayor de cada cuadro que se analiza: más chico = más rápido en el celular. */
const LADO_MAX = 1600
/** Ventana para que el mismo número salga dos veces antes de aceptarlo. */
const VENTANA_CONFIRMAR_MS = 2500
/** Después de esto sin leer, se muestran consejos. */
const CONSEJO_DESPUES_MS = 8000

/**
 * Lector nativo del navegador si existe (Chrome en Android); si no (iPhone), el
 * de respaldo. Su motor (zxing_reader.wasm, ~1 MB) se sirve desde la propia app
 * (public/) y se descarga recién al abrir el escáner. Si se actualiza la
 * dependencia barcode-detector, copiar de nuevo node_modules/zxing-wasm/dist/reader/zxing_reader.wasm.
 */
async function crearLector(): Promise<Lector> {
  const nativo = (globalThis as { BarcodeDetector?: { new (o: object): Lector; getSupportedFormats(): Promise<string[]> } })
    .BarcodeDetector
  if (nativo) {
    try {
      if ((await nativo.getSupportedFormats()).includes('ean_13')) return new nativo({ formats: FORMATOS })
    } catch {
      // sigue con el de respaldo
    }
  }
  const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill')
  await prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? '/zxing_reader.wasm' : prefix + path),
    },
    fireImmediately: true,
  })
  return new BarcodeDetector({ formats: FORMATOS as never })
}

/**
 * Cámara trasera + lectura del código de barras de la caja. Se analiza lo que
 * está dentro del recuadro (ampliado) y, alternando, todo el visor. Se acepta
 * un número cuando sale dos veces igual y cierra el dígito de control; después igual se confirma
 * el modelo en pantalla. Siempre se puede tipear el número de la etiqueta.
 * (Misma lógica que el editor de la tienda: tienda-martin/src/components/admin/Scanner.tsx.)
 */
export function Scanner({ onDetectar }: { onDetectar: (codigo: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [estado, setEstado] = useState<'abriendo' | 'leyendo' | 'lento' | 'error'>('abriendo')
  const [error, setError] = useState<string | null>(null)
  const [tipeado, setTipeado] = useState('')
  const [errorTipeado, setErrorTipeado] = useState<string | null>(null)
  const listo = useRef(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer = 0
    let timerConsejo = 0
    let cancelado = false
    const vistos = new Map<string, number[]>()

    const terminar = (codigo: string) => {
      if (listo.current) return
      listo.current = true
      navigator.vibrate?.(60)
      onDetectar(codigo)
    }

    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Este navegador no deja usar la cámara. Tipeá el número de la etiqueta.')
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
        if (cancelado || !video.current) return
        video.current.srcObject = stream
        await video.current.play()
        let lector: Lector
        try {
          lector = await crearLector()
        } catch {
          throw new Error('No se pudo cargar el lector. Revisá la conexión o tipeá el número de la etiqueta.')
        }
        if (cancelado) return
        setEstado('leyendo')
        timerConsejo = window.setTimeout(() => {
          if (!listo.current) setEstado('lento')
        }, CONSEJO_DESPUES_MS)

        const lienzo = document.createElement('canvas')
        const ctx = lienzo.getContext('2d', { willReadFrequently: true })
        let cuadro = 0
        const leer = async () => {
          if (cancelado || listo.current || !video.current || !ctx) return
          const v = video.current
          try {
            if (v.readyState >= 2 && v.videoWidth) {
              // Qué parte del video se ve en el visor (object-fit: cover recorta los bordes).
              const caja = v.getBoundingClientRect()
              const escala = Math.max(caja.width / v.videoWidth, caja.height / v.videoHeight)
              const visAncho = caja.width / escala
              const visAlto = caja.height / escala
              const visX = (v.videoWidth - visAncho) / 2
              const visY = (v.videoHeight - visAlto) / 2
              // Un cuadro el recuadro guía, el siguiente todo lo visible.
              const zona =
                cuadro++ % 2 === 0
                  ? {
                      x: visX + visAncho * GUIA.izq,
                      y: visY + visAlto * GUIA.arriba,
                      w: visAncho * (GUIA.der - GUIA.izq),
                      h: visAlto * (GUIA.abajo - GUIA.arriba),
                    }
                  : { x: visX, y: visY, w: visAncho, h: visAlto }
              const k = Math.min(2, LADO_MAX / Math.max(zona.w, zona.h))
              lienzo.width = Math.round(zona.w * k)
              lienzo.height = Math.round(zona.h * k)
              ctx.imageSmoothingQuality = 'high'
              ctx.drawImage(v, zona.x, zona.y, zona.w, zona.h, 0, 0, lienzo.width, lienzo.height)
              const encontrados = await lector.detect(lienzo)
              const codigo = encontrados.map((e) => limpiarCodigo(e.rawValue)).find(codigoValido)
              if (codigo) {
                // Se acepta recién cuando el mismo número sale dos veces en 2,5 s
                // (con cuadros sin lectura en el medio, no importa). Probado con
                // las etiquetas: una lectura suelta puede ser un número equivocado
                // que igual cierra el dígito de control.
                const ahora = performance.now()
                const veces = (vistos.get(codigo) ?? []).filter((t) => ahora - t < VENTANA_CONFIRMAR_MS)
                veces.push(ahora)
                vistos.set(codigo, veces)
                if (veces.length >= 2) terminar(codigo)
              }
            }
          } catch {
            // un cuadro que no se pudo leer: se prueba con el siguiente
          }
          timer = window.setTimeout(leer, 60)
        }
        leer()
      } catch (e) {
        if (cancelado) return
        const sinPermiso = e instanceof DOMException && e.name === 'NotAllowedError'
        setError(
          sinPermiso
            ? 'No hay permiso para usar la cámara. Activalo en el navegador o tipeá el número de la etiqueta.'
            : e instanceof Error
              ? e.message
              : 'No se pudo abrir la cámara.',
        )
        setEstado('error')
      }
    })()

    return () => {
      cancelado = true
      window.clearTimeout(timer)
      window.clearTimeout(timerConsejo)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onDetectar])

  function usarTipeado(e: SubmitEvent) {
    e.preventDefault()
    const codigo = limpiarCodigo(tipeado)
    if (!codigoValido(codigo)) {
      setErrorTipeado('Ese número no es válido. Revisalo en la etiqueta (son 13 dígitos).')
      return
    }
    listo.current = true
    onDetectar(codigo)
  }

  const mensaje =
    estado === 'abriendo'
      ? 'Abriendo la cámara y el lector…'
      : estado === 'leyendo'
        ? 'Poné el código de barras adentro del recuadro, a unos 15 cm.'
        : estado === 'lento'
          ? 'Todavía no lee: acercá o alejá el celular hasta que el código se vea nítido y grande en el recuadro, con buena luz y sin reflejo. O tipeá los números abajo.'
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
              left: `${GUIA.izq * 100}%`,
              right: `${(1 - GUIA.der) * 100}%`,
              top: `${GUIA.arriba * 100}%`,
              bottom: `${(1 - GUIA.abajo) * 100}%`,
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
    </div>
  )
}
