// Ida y vuelta real: abrir un PDF, editar, exportar y volver a leerlo con dos lectores distintos
// (pdf.js y PDFium). La promesa de privacidad: el texto viejo no se recupera de ninguna forma.
import { readFile, writeFile } from 'node:fs/promises'
import { beforeAll, describe, expect, it } from 'vitest'
import { PDFDocument } from '@cantoo/pdf-lib'
import type { PdfEngine, TextBlock } from '../engine'
import { createPdfium, type Pdfium } from './erase'
import { exportPdf, type ExportReport } from './export'
import { unreachableRefs } from './gc'
import { changedOutside, editOf, fonts, open, renderPage, toBuffer } from './test-utils'

const FIXTURES = 'test-fixtures/generated'

/** Todo el texto de la página según PDFium (un segundo lector, independiente de pdf.js). */
function pdfiumText(pdfium: Pdfium, bytes: Uint8Array): string {
  const { pdfium: mod } = pdfium
  const memory = (mod.wasmExports as unknown as { memory: WebAssembly.Memory }).memory
  const ptr = mod.wasmExports.malloc(bytes.length)
  new Uint8Array(memory.buffer).set(bytes, ptr)
  const doc = pdfium.FPDF_LoadMemDocument(ptr, bytes.length, '')
  const page = pdfium.FPDF_LoadPage(doc, 0)
  const textPage = pdfium.FPDFText_LoadPage(page)
  const count = pdfium.FPDFText_CountChars(textPage)
  const buf = mod.wasmExports.malloc((count + 1) * 2)
  pdfium.FPDFText_GetText(textPage, 0, count, buf)
  const text = mod.UTF16ToString(buf)
  mod.wasmExports.free(buf)
  pdfium.FPDFText_ClosePage(textPage)
  pdfium.FPDF_ClosePage(page)
  pdfium.FPDF_CloseDocument(doc)
  mod.wasmExports.free(ptr)
  return text
}

const squash = (s: string) => s.replace(/\s+/g, '')

describe('exportar con ediciones (cv-calibri.pdf)', () => {
  let pdfium: Pdfium
  let original: Uint8Array
  let before: TextBlock[]
  let output: Uint8Array
  let report: ExportReport
  let after: TextBlock[]

  beforeAll(async () => {
    const wasm = await readFile('node_modules/@embedpdf/pdfium/dist/pdfium.wasm')
    pdfium = await createPdfium(toBuffer(wasm))
    original = new Uint8Array(await readFile(`${FIXTURES}/cv-calibri.pdf`))

    const engine = await open(original)
    const paragraphs = await engine.getTextBlocks(1, 'paragraph')
    before = await engine.getTextBlocks(1, 'line')
    const doc = { pages: [] as Awaited<ReturnType<PdfEngine['load']>>['pages'] }
    doc.pages = (await engine.load(toBuffer(original))).pages
    const job = paragraphs.find((b) => b.text.includes('Ingeniero de Software'))!
    const name = paragraphs.find((b) => b.text === 'José Núñez Peña')!

    const result = await exportPdf(
      {
        original,
        edits: [
          editOf(job, 'Ingeniero de Software', 'Ingeniera Sénior de Software'),
          editOf(name, 'José Núñez Peña', 'Ana Sofía Ibáñez'),
        ],
        blocks: new Map([job, name].map((b) => [b.id, b])),
        pages: doc.pages,
        pageLines: new Map([[1, before]]),
      },
      { pdfium, fonts },
    )
    output = result.bytes
    // Para mirarlo: EXPORT_OUT=ruta.pdf npx vitest run src/core/writer
    if (process.env.EXPORT_OUT) await writeFile(process.env.EXPORT_OUT, output)
    report = result.report
    await engine.destroy()

    const reread = await open(output)
    after = await reread.getTextBlocks(1, 'line')
    await reread.destroy()
  }, 30_000)

  it('el texto viejo ya no se puede extraer, ni con pdf.js ni con PDFium', () => {
    const viaPdfjs = squash(after.map((l) => l.text).join(''))
    const viaPdfium = squash(pdfiumText(pdfium, output))
    for (const old of ['Ingeniero de Software', 'José Núñez Peña']) {
      expect(viaPdfjs).not.toContain(squash(old))
      expect(viaPdfium).not.toContain(squash(old))
    }
  })

  it('el texto nuevo sí es texto (se puede copiar y buscar)', () => {
    const texts = after.map((l) => l.text)
    expect(texts).toContain('Ana Sofía Ibáñez')
    expect(texts.some((t) => t.includes('Ingeniera Sénior de Software'))).toBe(true)
  })

  it('el resto de la página queda intacto', () => {
    const edited = /Ingeniero de Software|José Núñez Peña/
    const untouched = before.filter((l) => !edited.test(l.text)).map((l) => l.text)
    const now = new Set(after.map((l) => l.text))
    expect(untouched.filter((t) => !now.has(t))).toEqual([])
  })

  it('no quedan objetos sueltos con el contenido viejo dentro del archivo', async () => {
    const doc = await PDFDocument.load(output)
    expect(unreachableRefs(doc)).toEqual([])
  })

  it('conserva la posición: la línea editada sigue en su renglón', () => {
    const was = before.find((l) => l.text.includes('Ingeniero de Software'))!
    const now = after.find((l) => l.text.includes('Ingeniera Sénior de Software'))!
    expect(now.baseline).toBeCloseTo(was.baseline, 0)
    expect(now.x).toBeCloseTo(was.x, 0)
  })

  it('reporta sin sorpresas: todo se borró y no faltan glifos', () => {
    expect(report.notErased).toEqual([])
    expect(report.missingGlyphs).toEqual([])
  })

  it('pesa poco: la gemela se embebe recortada', () => {
    expect(output.length - original.length).toBeLessThan(40_000)
  })
})

describe('exportar no toca nada fuera de lo editado (píxeles)', () => {
  it('cv-calibri.pdf: fuera de las zonas editadas, la página se ve idéntica', async () => {
    const wasm = await readFile('node_modules/@embedpdf/pdfium/dist/pdfium.wasm')
    const pdfium = await createPdfium(toBuffer(wasm))
    const original = new Uint8Array(await readFile(`${FIXTURES}/cv-calibri.pdf`))
    const engine = await open(original)
    const { pages } = await engine.load(toBuffer(original))
    const paragraphs = await engine.getTextBlocks(1, 'paragraph')
    const lines = await engine.getTextBlocks(1, 'line')
    await engine.destroy()

    const job = paragraphs.find((b) => b.text.includes('Ingeniero de Software'))!
    const { bytes } = await exportPdf(
      {
        original,
        edits: [editOf(job, 'Ingeniero de Software', 'Ingeniera Sénior de Software')],
        blocks: new Map([[job.id, job]]),
        pages,
        pageLines: new Map([[1, lines]]),
      },
      { pdfium, fonts },
    )

    // La zona editada: la caja original más lo que ocupe ahora el texto nuevo.
    const reread = await open(bytes)
    const now = (await reread.getTextBlocks(1, 'line')).filter((l) =>
      l.text.includes('Ingeniera Sénior'),
    )
    await reread.destroy()
    expect(now).toHaveLength(1)

    const scale = 2
    const a = await renderPage(original, 1, scale)
    const b = await renderPage(bytes, 1, scale)
    const { changed, total } = changedOutside(a, b, pages[0]!, scale, [job, ...now])
    expect(changed / total).toBeLessThan(0.0001)
    // Controles: casi toda la página entra en la comparación, y sin la máscara el cambio sí se ve.
    expect(total).toBeGreaterThan(a.width * a.height * 0.9)
    expect(changedOutside(a, b, pages[0]!, scale, []).changed).toBeGreaterThan(100)
  }, 30_000)
})
