import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import { codigoValido, limpiarCodigo } from '../lib/ean'

type Lector = { detect: (fuente: HTMLVideoElement | HTMLCanvasElement) => Promise<{ rawValue: string }[]> }

const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

/**
 * Lector nativo del navegador si existe (Chrome en Android); si no (iPhone), el
 * de respaldo, que se descarga recién al abrir el escáner.
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
  const { BarcodeDetector } = await import('barcode-detector/ponyfill')
  return new BarcodeDetector({ formats: FORMATOS as never })
}

/**
 * Cámara trasera + lectura del código de barras de la caja. Acepta un código
 * recién cuando lo lee dos veces igual y cierra el dígito de control. Siempre
 * se puede tipear el número de la etiqueta.
 * (Misma lógica que el editor de la tienda: tienda-martin/src/components/admin/Scanner.tsx.)
 */
export function Scanner({ onDetectar }: { onDetectar: (codigo: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [estado, setEstado] = useState<'abriendo' | 'leyendo' | 'error'>('abriendo')
  const [error, setError] = useState<string | null>(null)
  const [tipeado, setTipeado] = useState('')
  const [errorTipeado, setErrorTipeado] = useState<string | null>(null)
  const listo = useRef(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer = 0
    let cancelado = false
    let ultimo = ''
    let ultimoEn = 0

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
        const lector = await crearLector()
        if (cancelado) return
        setEstado('leyendo')
        // Un cuadro se lee entero y el siguiente solo el recuadro guía, ampliado:
        // así se lee aunque la caja quede un poco lejos.
        const zoom = document.createElement('canvas')
        const zoomCtx = zoom.getContext('2d')
        let cuadro = 0
        const leer = async () => {
          if (cancelado || listo.current || !video.current) return
          try {
            const v = video.current
            if (v.readyState >= 2 && v.videoWidth) {
              let fuente: HTMLVideoElement | HTMLCanvasElement = v
              if (cuadro++ % 2 === 1 && zoomCtx) {
                const sw = v.videoWidth * 0.8
                const sh = v.videoHeight * 0.5
                const escala = Math.min(2, 1600 / sw)
                zoom.width = Math.round(sw * escala)
                zoom.height = Math.round(sh * escala)
                zoomCtx.imageSmoothingQuality = 'high'
                zoomCtx.drawImage(v, (v.videoWidth - sw) / 2, (v.videoHeight - sh) / 2, sw, sh, 0, 0, zoom.width, zoom.height)
                fuente = zoom
              }
              const encontrados = await lector.detect(fuente)
              const codigo = encontrados.map((e) => limpiarCodigo(e.rawValue)).find(codigoValido)
              if (codigo) {
                const ahora = performance.now()
                if (codigo === ultimo && ahora - ultimoEn < 1500) terminar(codigo)
                ultimo = codigo
                ultimoEn = ahora
              }
            }
          } catch {
            // un cuadro que no se pudo leer: se prueba con el siguiente
          }
          timer = window.setTimeout(leer, 180)
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

  return (
    <div className="scanner">
      <div className="scanner-video">
        <video ref={video} playsInline muted />
        {estado === 'leyendo' && <div className="scanner-guia" aria-hidden="true" />}
        <p className="scanner-estado">
          {estado === 'abriendo'
            ? 'Abriendo la cámara…'
            : estado === 'leyendo'
              ? 'Apuntá al código de barras de la caja, a un palmo.'
              : error}
        </p>
      </div>

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
