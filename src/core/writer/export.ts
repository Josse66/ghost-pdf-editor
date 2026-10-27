// Exportación: PDF original + ediciones → PDF nuevo.
//  1. PDFium borra los objetos de texto de cada bloque editado (privacidad: no se tapa, se quita).
//  2. pdf-lib abre el resultado y tira los objetos sueltos (el contenido viejo de la página).
//  3. Cada bloque se redibuja con su gemela, línea por línea, como lo cortó el editor.
// Guardado completo: el archivo se reescribe entero, sin versiones viejas al final.
import {
  concatTransformationMatrix,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type PDFPage,
} from '@cantoo/pdf-lib'
import fontkit from '@cantoo/fontkit'
import type { BlockEdit, EditedRun } from '../edits/history'
import type { Box, PageInfo, Rgb, TextBlock } from '../engine'
import { substituteFor } from '../fonts/substitutes'
import { eraseText, type ErasedObject, type Pdfium } from './erase'
import { freeRight, guessAlign, planBlock, splitIntoLines, type PlannedLine } from './fit'
import { TwinFont, type FontSource } from './fonts'
import { dropUnreachable } from './gc'

export interface ExportRequest {
  original: Uint8Array
  edits: readonly BlockEdit[]
  /** Bloques originales por id (los que se editaron, como mínimo). */
  blocks: ReadonlyMap<string, TextBlock>
  pages: readonly PageInfo[]
  /** Líneas de cada página editada: deciden cuánto espacio libre hay a la derecha. */
  pageLines: ReadonlyMap<number, readonly TextBlock[]>
}

export interface ExportDeps {
  pdfium: Pdfium
  fonts: FontSource
}

/** Lo que la app tiene que avisar: nada aquí es silencioso. */
export interface ExportReport {
  /** Bloques cuyo texto viejo no se encontró para borrar (p. ej. vive dentro de un XObject). */
  notErased: string[]
  squeezed: string[]
  shrunk: string[]
  /** Bloques que crecieron hacia abajo de sus renglones originales. */
  overflow: string[]
  /** Caracteres que ninguna gemela tiene. */
  missingGlyphs: string[]
}

export async function exportPdf(
  request: ExportRequest,
  deps: ExportDeps,
): Promise<{ bytes: Uint8Array; report: ExportReport }> {
  const edits = request.edits.filter((e) => request.blocks.has(e.blockId))
  const report: ExportReport = {
    notErased: [],
    squeezed: [],
    shrunk: [],
    overflow: [],
    missingGlyphs: [],
  }

  const { bytes: erasedBytes, erased } = eraseText(
    deps.pdfium,
    request.original,
    edits.map((e) => {
      const block = request.blocks.get(e.blockId)!
      return { key: e.blockId, page: e.page, boxes: block.lines ?? [block] }
    }),
  )

  const doc = await PDFDocument.load(erasedBytes, { updateMetadata: false })
  doc.registerFontkit(fontkit)
  dropUnreachable(doc)

  const twins = new Map<string, Promise<TwinFont>>()
  const twinFor = (style: TextBlock['runs'][number]) => {
    const { family } = substituteFor(style.fontFamily, style.generic)
    const key = `${family}|${style.bold}|${style.italic}`
    let twin = twins.get(key)
    if (!twin) {
      twin = deps.fonts(family, style.bold, style.italic).then((files) => TwinFont.load(doc, files))
      twins.set(key, twin)
    }
    return twin
  }

  const isolated = new Set<number>()
  for (const edit of edits) {
    const block = request.blocks.get(edit.blockId)!
    const info = request.pages.find((p) => p.page === edit.page)
    if (!info) continue
    const page = doc.getPage(edit.page - 1)
    if (!isolated.has(edit.page)) {
      isolateOriginalContent(doc, page)
      isolated.add(edit.page)
    }

    const removed = erased.get(edit.blockId) ?? []
    if (!removed.length) report.notErased.push(edit.blockId)

    // Se mide antes de planear: medir embebe la gemela, y eso es asíncrono.
    const widths = new Map<string, number>()
    const styleOf = (run: EditedRun) => block.runs[run.style] ?? block.runs[0]!
    const texts = edit.lines.length ? edit.lines : edit.after.split('\n')
    for (const run of splitIntoLines(edit.runs, texts).flat()) {
      const style = styleOf(run)
      const twin = await twinFor(style)
      widths.set(key(run), await twin.width(run.text, style.fontSize))
    }

    const [left = 0, , right = info.width] = info.view
    const plan = planBlock(edit, block, (run) => widths.get(key(run)) ?? 0, {
      right: freeRight(block, request.pageLines.get(edit.page) ?? [block]),
      align: guessAlign(block, left, right - left),
    })
    if (plan.squeezed) report.squeezed.push(edit.blockId)
    if (plan.shrunk) report.shrunk.push(edit.blockId)
    if (plan.overflow) report.overflow.push(edit.blockId)

    for (const line of plan.lines) {
      await drawLine(page, line, async (run) => {
        const style = styleOf(run)
        return {
          twin: await twinFor(style),
          size: style.fontSize,
          color: colorOf(style, removed),
        }
      })
    }
  }

  for (const twin of twins.values())
    for (const ch of (await twin).missing) report.missingGlyphs.push(ch)
  report.missingGlyphs = [...new Set(report.missingGlyphs)]

  // Sin flujos de objetos: cada objeto queda a la vista y se puede comprobar que no sobra nada.
  const bytes = await doc.save({ useObjectStreams: false })
  return { bytes, report }
}

const key = (run: EditedRun) => `${run.style}\u0000${run.text}`

/**
 * Encierra el contenido original de la página entre q/Q. Si dejó la matriz o el color cambiados
 * (pasa en PDFs reales), lo que dibujamos después empieza limpio.
 */
function isolateOriginalContent(doc: PDFDocument, page: PDFPage) {
  page.node.normalize()
  const start = doc.context.register(doc.context.contentStream([pushGraphicsState()]))
  const end = doc.context.register(doc.context.contentStream([popGraphicsState()]))
  page.node.wrapContentStreams(start, end)
}

async function drawLine(
  page: PDFPage,
  line: PlannedLine,
  styleFor: (run: EditedRun) => Promise<{ twin: TwinFont; size: number; color: Rgb }>,
) {
  // El apretado (Tz) se aplica escalando en x alrededor del inicio de la línea.
  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(line.squeeze, 0, 0, 1, line.x * (1 - line.squeeze), 0),
  )
  let x = line.x
  for (const run of line.runs) {
    const { twin, size: base, color } = await styleFor(run)
    const size = base * line.shrink
    for (const segment of await twin.segments(run.text)) {
      page.drawText(segment.text, {
        x,
        y: line.baseline,
        size,
        font: segment.font,
        color: rgb(...color),
      })
      x += segment.font.widthOfTextAtSize(segment.text, size)
    }
  }
  page.pushOperators(popGraphicsState())
}

/** Color real del texto borrado bajo ese run (PDFium lo da); si no hay, el que se conozca o negro. */
function colorOf(run: Box & { color?: Rgb }, removed: readonly ErasedObject[]): Rgb {
  const counts = new Map<string, { color: Rgb; n: number }>()
  for (const obj of removed) {
    const cx = obj.box.x + obj.box.width / 2
    const cy = obj.box.y + obj.box.height / 2
    const inside = cx >= run.x && cx <= run.x + run.width && cy >= run.y && cy <= run.y + run.height
    if (!inside) continue
    const k = obj.color.join()
    const entry = counts.get(k) ?? { color: obj.color, n: 0 }
    entry.n++
    counts.set(k, entry)
  }
  const best = [...counts.values()].sort((a, b) => b.n - a.n)[0]
  return best?.color ?? run.color ?? removed[0]?.color ?? [0, 0, 0]
}
