// Exportación en un hilo aparte: PDFium (wasm de ~4.6 MB) y las gemelas se descargan del propio
// origen la primera vez que se exporta, y el visor no se congela mientras se arma el PDF.
// El wasm se sirve desde nuestro origen: sin él, PDFium lo bajaría de un CDN externo.
import wasmUrl from '@embedpdf/pdfium/pdfium.wasm?url'
import { createPdfium, type Pdfium } from '@/core/writer/erase'
import { exportPdf, type ExportReport, type ExportRequest } from '@/core/writer/export'
import type { FontSource } from '@/core/writer/fonts'

export type ExportReply =
  { type: 'done'; bytes: Uint8Array; report: ExportReport } | { type: 'error'; message: string }

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
      return new Uint8Array(await (await fetch(url)).arrayBuffer())
    }),
  )
}

const rank = (subset: string) => {
  const i = SUBSET_ORDER.indexOf(subset)
  return i === -1 ? SUBSET_ORDER.length : i
}

let pdfium: Promise<Pdfium> | null = null
const loadPdfium = () =>
  (pdfium ??= fetch(wasmUrl)
    .then((r) => r.arrayBuffer())
    .then(createPdfium))

self.onmessage = async (event: MessageEvent<ExportRequest>) => {
  try {
    const { bytes, report } = await exportPdf(event.data, { pdfium: await loadPdfium(), fonts })
    const reply: ExportReply = { type: 'done', bytes, report }
    self.postMessage(reply, { transfer: [bytes.buffer] })
  } catch (error) {
    pdfium = null
    const reply: ExportReply = {
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    }
    self.postMessage(reply)
  }
}
