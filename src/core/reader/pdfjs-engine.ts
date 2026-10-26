// Implementación de PdfEngine sobre pdf.js. Recibe el módulo de pdf.js para que la app use la
// build normal (con su worker) y los tests en Node la build "legacy", sin que el núcleo elija.
import type * as Pdfjs from 'pdfjs-dist'
import type {
  LoadedDocument,
  LoadProgress,
  PageInfo,
  PdfEngine,
  RenderTarget,
  TextBlock,
} from '../engine'
import { groupLines } from '../layout/lines'
import { groupParagraphs } from '../layout/paragraphs'
import { toFragments, type RawTextItem } from './fragments'

type PdfjsModule = Pick<typeof Pdfjs, 'getDocument'>
type LoadingTask = ReturnType<PdfjsModule['getDocument']>
type PdfDocument = Awaited<LoadingTask['promise']>

export function createPdfjsEngine(pdfjs: PdfjsModule): PdfEngine {
  let task: LoadingTask | null = null
  let doc: PdfDocument | null = null
  const lineCache = new Map<number, Promise<TextBlock[]>>()

  function requireDoc(): PdfDocument {
    if (!doc) throw new Error('No hay ningún PDF cargado.')
    return doc
  }

  async function readLines(pageNumber: number): Promise<TextBlock[]> {
    const page = await requireDoc().getPage(pageNumber)
    const content = await page.getTextContent()
    // Carga las fuentes en commonObjs para leer su nombre real ("AAAAAA+Calibri-Bold").
    await page.getOperatorList()
    const items = content.items.filter((item): item is RawTextItem & typeof item => 'str' in item)
    const fragments = toFragments(items, content.styles, (loadedName) =>
      page.commonObjs.has(loadedName)
        ? (page.commonObjs.get(loadedName) as { name?: string } | null)?.name
        : undefined,
    )
    return groupLines(fragments, pageNumber)
  }

  return {
    async load(data: ArrayBuffer, onProgress?: LoadProgress): Promise<LoadedDocument> {
      await this.destroy()
      // pdf.js transfiere el buffer al worker; se copia para que quien llama conserve el original.
      // fontExtraProperties conserva el nombre real de cada fuente y sus bytes (cobertura de glifos).
      task = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)), fontExtraProperties: true })
      doc = await task.promise
      const pages: PageInfo[] = []
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n)
        const { width, height } = page.getViewport({ scale: 1 })
        const [x0 = 0, y0 = 0, x1 = width, y1 = height] = page.view
        pages.push({ page: n, width, height, rotate: page.rotate, view: [x0, y0, x1, y1] })
        onProgress?.(n, doc.numPages)
      }
      return { numPages: doc.numPages, pages }
    },

    async getTextBlocks(page, kind = 'paragraph') {
      let lines = lineCache.get(page)
      if (!lines) {
        lines = readLines(page)
        lineCache.set(page, lines)
      }
      return kind === 'line' ? lines : groupParagraphs(await lines)
    },

    async renderPage(pageNumber: number, { canvas, scale, signal }: RenderTarget) {
      const page = await requireDoc().getPage(pageNumber)
      const viewport = page.getViewport({ scale })
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      const renderTask = page.render({ canvas: canvas as HTMLCanvasElement, viewport })
      const cancel = () => renderTask.cancel()
      signal?.addEventListener('abort', cancel, { once: true })
      try {
        await renderTask.promise
      } finally {
        signal?.removeEventListener('abort', cancel)
      }
    },

    async exportWithEdits() {
      throw new Error('La exportación llega en la Fase 4.')
    },

    async destroy() {
      lineCache.clear()
      // En pdf.js 6 el documento ya no tiene destroy(): se destruye su tarea de carga.
      await task?.destroy()
      task = null
      doc = null
    },
  }
}
