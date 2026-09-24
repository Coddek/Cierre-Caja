import { useRef, useState } from 'react'
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
// con el menú de compartir del celu (WhatsApp, etc.); si no se puede, la
// descarga, y si la imagen falla, comparte el resumen en texto.
//
// La imagen se arma recién al tocar el botón, nunca al cargar la pantalla:
// armarla apenas se mostraba el día cerrado colgaba la app en algunos celus.
export function CompartirResumen({ cierre, gastos }: { cierre: CierreConEditor; gastos: Gasto[] }) {
  const imagenRef = useRef<HTMLDivElement>(null)
  // Imagen ya armada, junto con los datos con los que se armó: si el cierre
  // cambia (reabrir y volver a cerrar) deja de valer.
  const [lista, setLista] = useState<{ archivo: File; cierre: CierreConEditor; gastos: Gasto[] } | null>(null)
  const [preparando, setPreparando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const imagen = lista && lista.cierre === cierre && lista.gastos === gastos ? lista.archivo : null

  async function compartirTexto() {
    const texto = resumenCierreTexto(cierre, gastos)
    try {
      if (navigator.share) {
        await navigator.share({ text: texto })
      } else {
        await navigator.clipboard.writeText(texto)
        setAviso('Resumen copiado. Pegalo en WhatsApp o donde quieras.')
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setAviso('No se pudo compartir el resumen en este dispositivo.')
      }
    }
  }

  async function compartirImagen(archivo: File) {
    if (!navigator.canShare?.({ files: [archivo] })) {
      descargar(archivo)
      setAviso('Imagen descargada. Mandala por WhatsApp o donde quieras.')
      return
    }
    try {
      await navigator.share({ files: [archivo] })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'NotAllowedError') {
        // Armar la imagen tardó y el celu (sobre todo iPhone) ya no acepta
        // abrir el menú por ese toque. Con la imagen lista, el próximo toque
        // la manda al instante.
        setAviso('La imagen está lista. Tocá "Enviar imagen" para mandarla.')
      } else if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setAviso('No se pudo abrir el menú de compartir. Probá de nuevo.')
      }
    }
  }

  async function handleCompartir() {
    setAviso(null)
    if (imagen) {
      await compartirImagen(imagen)
      return
    }
    if (!imagenRef.current) return

    setPreparando(true)
    let archivo: File
    try {
      archivo = await generarImagen(imagenRef.current, `cierre-${cierre.fecha}.png`)
    } catch {
      setPreparando(false)
      await compartirTexto()
      return
    }
    setPreparando(false)
    setLista({ archivo, cierre, gastos })
    await compartirImagen(archivo)
  }

  return (
    <>
      <ResumenImagen cierre={cierre} gastos={gastos} ref={imagenRef} />
      <button type="button" className="btn-compartir" onClick={handleCompartir} disabled={preparando}>
        {preparando ? 'Preparando imagen...' : imagen ? 'Enviar imagen' : 'Compartir resumen'}
      </button>
      {aviso && <p className="aviso-compartir">{aviso}</p>}
    </>
  )
}
