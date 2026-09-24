import { useEffect, useRef, useState } from 'react'
import { toBlob } from 'html-to-image'
import type { Database } from '../lib/database.types'
import type { CierreConEditor } from '../lib/types'
import { resumenCierreTexto } from '../lib/resumenTexto'
import { ResumenImagen } from './ResumenImagen'

type Gasto = Database['public']['Tables']['gastos']['Row']

async function generarImagen(nodo: HTMLElement, nombre: string): Promise<File> {
  await document.fonts.ready
  const opciones = { pixelRatio: 3, cacheBust: true }
  // Safari a veces no incluye fuentes/imágenes en la primera pasada; la
  // segunda sale bien. Es el workaround conocido de html-to-image.
  await toBlob(nodo, opciones)
  const blob = await toBlob(nodo, opciones)
  if (!blob) throw new Error('No se pudo generar la imagen')
  return new File([blob], nombre, { type: 'image/png' })
}

function descargar(archivo: File) {
  const url = URL.createObjectURL(archivo)
  const a = document.createElement('a')
  a.href = url
  a.download = archivo.name
  a.click()
  URL.revokeObjectURL(url)
}

// Botón "Compartir resumen" del día cerrado. Manda una imagen del resumen
// (con el menú de compartir del celu: WhatsApp, etc.); si no se puede,
// la descarga, y si la imagen falla, comparte el resumen en texto.
export function CompartirResumen({ cierre, gastos }: { cierre: CierreConEditor; gastos: Gasto[] }) {
  const imagenRef = useRef<HTMLDivElement>(null)
  const [imagen, setImagen] = useState<File | null>(null)
  const [fallo, setFallo] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  // La imagen se prepara apenas se muestra el día cerrado (y cada vez que
  // cambia): si se generara recién al tocar el botón, en iPhone el menú de
  // compartir puede bloquearse por tardar demasiado desde el toque.
  useEffect(() => {
    let cancelado = false
    setImagen(null)
    setFallo(false)
    if (!imagenRef.current) return
    generarImagen(imagenRef.current, `cierre-${cierre.fecha}.png`)
      .then((archivo) => !cancelado && setImagen(archivo))
      .catch(() => !cancelado && setFallo(true))
    return () => {
      cancelado = true
    }
  }, [cierre, gastos])

  async function compartirTexto() {
    const texto = resumenCierreTexto(cierre, gastos)
    if (navigator.share) {
      await navigator.share({ text: texto }).catch(() => {})
      return
    }
    try {
      await navigator.clipboard.writeText(texto)
      setAviso('Resumen copiado. Pegalo en WhatsApp o donde quieras.')
    } catch {
      setAviso('No se pudo compartir el resumen en este dispositivo.')
    }
  }

  async function handleCompartir() {
    setAviso(null)
    if (!imagen) {
      await compartirTexto()
      return
    }
    if (navigator.canShare?.({ files: [imagen] })) {
      try {
        await navigator.share({ files: [imagen] })
      } catch (e) {
        // AbortError = cerró el menú sin elegir nada, no es un error.
        if (e instanceof DOMException && e.name !== 'AbortError') {
          setAviso('No se pudo abrir el menú de compartir. Probá de nuevo.')
        }
      }
      return
    }
    descargar(imagen)
    setAviso('Imagen descargada. Mandala por WhatsApp o donde quieras.')
  }

  const preparando = !imagen && !fallo

  return (
    <>
      <ResumenImagen cierre={cierre} gastos={gastos} ref={imagenRef} />
      <button type="button" className="btn-compartir" onClick={handleCompartir} disabled={preparando}>
        {preparando ? 'Preparando imagen...' : 'Compartir resumen'}
      </button>
      {aviso && <p className="aviso-compartir">{aviso}</p>}
    </>
  )
}
