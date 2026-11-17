import { useCallback, useEffect, useState } from 'react'
import { mensajeError } from '../lib/errors'
import { formatMonto } from '../lib/format'
import { elegirPar, leerEncontrados, type ParEncontrado, type ParVendido } from '../lib/pares'
import { supabase } from '../lib/supabase'
import { Scanner } from './Scanner'

type Paso =
  | { tipo: 'escanear' }
  | { tipo: 'buscando'; codigo: string }
  | { tipo: 'encontrado'; par: ParEncontrado }
  | { tipo: 'no-encontrado'; codigo: string }
  | { tipo: 'manual' }

const fotoUrl = (path: string) =>
  `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/tienda-fotos/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`

/**
 * Escanear la caja del par que se vende: muestra modelo, color, talle y precio
 * para confirmar antes de agregarlo a la venta. Si la caja no tiene etiqueta,
 * se busca el modelo a mano. El stock se descuenta recién al guardar la venta.
 */
export function EscanearPar({
  onAgregar,
  onCancelar,
}: {
  onAgregar: (par: ParVendido) => void
  onCancelar: () => void
}) {
  const [paso, setPaso] = useState<Paso>({ tipo: 'escanear' })
  const [error, setError] = useState<string | null>(null)

  const onDetectar = useCallback(async (codigo: string) => {
    setError(null)
    setPaso({ tipo: 'buscando', codigo })
    const { data, error } = await supabase.rpc('tienda_buscar_codigo', { p_codigo: codigo })
    if (error) {
      setError(mensajeError(error))
      setPaso({ tipo: 'escanear' })
      return
    }
    const [par] = leerEncontrados(data)
    setPaso(par ? { tipo: 'encontrado', par } : { tipo: 'no-encontrado', codigo })
  }, [])

  return (
    <div className="escanear-par">
      {error && <p className="mensaje-error">{error}</p>}

      {paso.tipo === 'escanear' && (
        <>
          <Scanner onDetectar={onDetectar} />
          <div className="escanear-par-acciones">
            <button type="button" className="btn-secundario" onClick={() => setPaso({ tipo: 'manual' })}>
              La caja no tiene etiqueta
            </button>
            <button type="button" className="btn-link" onClick={onCancelar}>
              Volver a la venta
            </button>
          </div>
        </>
      )}

      {paso.tipo === 'buscando' && <p className="escanear-par-cargando">Buscando {paso.codigo}…</p>}

      {paso.tipo === 'no-encontrado' && (
        <div className="par-tarjeta">
          <p className="par-titulo">Este código no está cargado</p>
          <p className="par-detalle">
            {paso.codigo}: todavía no se escaneó al cargar mercadería en el editor de la tienda. Buscá el modelo a
            mano o cargá la venta sin el par.
          </p>
          <div className="escanear-par-acciones">
            <button type="button" className="btn-principal" onClick={() => setPaso({ tipo: 'manual' })}>
              Buscar el modelo a mano
            </button>
            <button type="button" className="btn-secundario" onClick={() => setPaso({ tipo: 'escanear' })}>
              Escanear de nuevo
            </button>
            <button type="button" className="btn-link" onClick={onCancelar}>
              Volver a la venta
            </button>
          </div>
        </div>
      )}

      {paso.tipo === 'manual' && (
        <BusquedaManual
          onElegir={(par) => setPaso({ tipo: 'encontrado', par })}
          onEscanear={() => setPaso({ tipo: 'escanear' })}
        />
      )}

      {paso.tipo === 'encontrado' && (
        <Confirmar
          par={paso.par}
          onAgregar={onAgregar}
          onOtro={() => setPaso({ tipo: 'escanear' })}
        />
      )}
    </div>
  )
}

function Confirmar({
  par,
  onAgregar,
  onOtro,
}: {
  par: ParEncontrado
  onAgregar: (par: ParVendido) => void
  onOtro: () => void
}) {
  // Si el código es de un solo talle, ya viene elegido.
  const [talleId, setTalleId] = useState<string | null>(par.talle_id)
  const talle = par.talles.find((t) => t.id === talleId)

  return (
    <div className="par-tarjeta">
      <div className="par-cabecera">
        {par.foto_path && <img src={fotoUrl(par.foto_path)} alt="" className="par-foto" />}
        <div>
          <p className="par-titulo">{par.producto}</p>
          <p className="par-detalle">
            {par.color} · Ref. {par.ref}
          </p>
          <p className="par-precio">{formatMonto(par.precio)}</p>
        </div>
      </div>

      {par.talle_id && talle ? (
        <p className="par-talle-fijo">
          Talle <strong>{talle.talle}</strong>
          {talle.talle_br ? ` (${talle.talle_br} BR)` : ''}
        </p>
      ) : (
        <div>
          <p className="par-pregunta">¿Qué talle es?</p>
          {par.talles.length === 0 ? (
            <p className="par-detalle">Este color todavía no tiene talles cargados en la tienda.</p>
          ) : (
            <div className="par-talles">
              {par.talles.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={talleId === t.id}
                  className={talleId === t.id ? 'par-talle par-talle--activo' : 'par-talle'}
                  onClick={() => setTalleId(t.id)}
                >
                  {t.talle}
                  <span>{t.stock > 0 ? `hay ${t.stock}` : 'sin stock'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {talle && talle.stock <= 0 && (
        <p className="par-aviso">
          Figura sin stock. Si lo tenés en la mano, vendelo igual: queda marcado para revisar el conteo.
        </p>
      )}
      {talle && talle.stock > 0 && (
        <p className="par-detalle">
          {talle.stock === 1 ? 'Es el último par de este talle.' : `Quedan ${talle.stock} pares de este talle.`}
        </p>
      )}

      <div className="escanear-par-acciones">
        <button
          type="button"
          className="btn-principal"
          disabled={!talle}
          onClick={() => {
            const elegido = talleId ? elegirPar(par, talleId) : null
            if (elegido) onAgregar(elegido)
          }}
        >
          Agregar a la venta
        </button>
        <button type="button" className="btn-link" onClick={onOtro}>
          No es este, escanear de nuevo
        </button>
      </div>
    </div>
  )
}

function BusquedaManual({
  onElegir,
  onEscanear,
}: {
  onElegir: (par: ParEncontrado) => void
  onEscanear: () => void
}) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<ParEncontrado[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (texto.trim().length < 2) return
    let cancelado = false
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc('tienda_buscar_modelos', { p_texto: texto })
      if (cancelado) return
      if (error) {
        setError(mensajeError(error))
        return
      }
      setError(null)
      setResultados(leerEncontrados(data))
    }, 300)
    return () => {
      cancelado = true
      window.clearTimeout(timer)
    }
  }, [texto])

  const buscando = texto.trim().length >= 2

  return (
    <div className="par-tarjeta">
      <label className="par-busqueda">
        Buscá el modelo por nombre o referencia
        <input
          autoFocus
          value={texto}
          placeholder="Ej.: 6291.900 o Paris"
          onChange={(e) => setTexto(e.target.value)}
        />
      </label>
      {error && <p className="mensaje-error">{error}</p>}
      {buscando && resultados?.length === 0 && <p className="par-detalle">No hay modelos con ese nombre o referencia.</p>}
      {buscando && resultados && resultados.length > 0 && (
        <ul className="par-resultados">
          {resultados.map((r) => (
            <li key={`${r.producto}-${r.ref}-${r.color}`}>
              <button type="button" onClick={() => onElegir(r)}>
                {r.foto_path && <img src={fotoUrl(r.foto_path)} alt="" className="par-foto par-foto--chica" />}
                <span>
                  <strong>{r.producto}</strong>
                  <small>
                    {r.color} · Ref. {r.ref} · {formatMonto(r.precio)}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn-link" onClick={onEscanear}>
        Mejor escanear la caja
      </button>
    </div>
  )
}
