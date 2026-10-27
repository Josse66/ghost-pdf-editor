// Exportación en un hilo aparte: PDFium (wasm de ~4.6 MB) y las gemelas se descargan del propio
// origen la primera vez que se exporta, y el visor no se congela mientras se arma el PDF.
// El wasm se sirve desde nuestro origen: sin él, PDFium lo bajaría de un CDN externo.
import wasmUrl from '@embedpdf/pdfium/pdfium.wasm?url'
import { createPdfium, type Pdfium } from '@/core/writer/erase'
import { exportPdf, type ExportReport, type ExportRequest } from '@/core/writer/export'
import type { FontSource } from '@/core/writer/fonts'

/** Bajando el motor y las gemelas (solo la primera vez), o armando el PDF. */
export type ExportStage = 'engine' | 'writing'
/** Sin red al bajar el motor (la primera exportación la necesita) o un PDF que no se pudo reescribir. */
export type ExportFailure = 'network' | 'pdf'

export type ExportReply =
  | { type: 'stage'; stage: ExportStage }
  | { type: 'done'; bytes: Uint8Array; report: ExportReport }
  | { type: 'error'; failure: ExportFailure; message: string }

/** Un recurso del propio origen que no llegó: sin conexión o despliegue a medias. */
class NetworkError extends Error {}

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  let response: Response
  try {
    response = await fetch(url)
  } catch (error) {
    throw new NetworkError(String(error))
  }
  if (!response.ok) throw new NetworkError(`${url}: ${response.status}`)
  return response.arrayBuffer()
}

// Los WOFF de Fontsource (los mismos que pinta el editor), como URLs que se piden al exportar.
const fontFiles = import.meta.glob<string>(
  '/node_modules/@fontsource/{carlito,caladea,arimo,tinos,cousine,gelasio}/files/*-{400,700}-{normal,italic}.woff',
  { query: '?url', import: 'default' },
)

/** Primero el alfabeto latino, luego el extendido; los demás (griego, cirílico…) al final. */
const SUBSET_ORDER = ['latin', 'latin-ext']

const fonts: FontSource = async (family, bold, italic) => {
  const name = family.toLowerCase()
  const suffix = `-${bold ? 700 : 400}-${italic ? 'italic' : 'normal'}.woff`
  const matches = Object.keys(fontFiles)
    .filter((path) => path.includes(`/@fontsource/${name}/`) && path.endsWith(suffix))
    .map((path) => ({
      path,
      subset: path
        .split('/')
        .pop()!
        .slice(name.length + 1, -suffix.length),
    }))
    .sort((a, b) => rank(a.subset) - rank(b.subset))
  return Promise.all(
    matches.map(async ({ path }) => {
      const url = await fontFiles[path]!()
      return new Uint8Array(await fetchBytes(url))
    }),
  )
}

const rank = (subset: string) => {
  const i = SUBSET_ORDER.indexOf(subset)
  return i === -1 ? SUBSET_ORDER.length : i
}

let pdfium: Promise<Pdfium> | null = null
const loadPdfium = () => (pdfium ??= fetchBytes(wasmUrl).then(createPdfium))

const post = (reply: ExportReply, transfer: Transferable[] = []) =>
  self.postMessage(reply, { transfer })

self.onmessage = async (event: MessageEvent<ExportRequest>) => {
  try {
    if (!pdfium) post({ type: 'stage', stage: 'engine' })
    const engine = await loadPdfium()
    post({ type: 'stage', stage: 'writing' })
    const { bytes, report } = await exportPdf(event.data, { pdfium: engine, fonts })
    post({ type: 'done', bytes, report }, [bytes.buffer])
  } catch (error) {
    // Si falló al bajar el motor, la próxima vez se vuelve a intentar.
    if (error instanceof NetworkError) pdfium = null
    post({
      type: 'error',
      failure: error instanceof NetworkError ? 'network' : 'pdf',
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
