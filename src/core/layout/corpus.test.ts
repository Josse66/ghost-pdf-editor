// Corre el motor real (pdf.js legacy en Node) sobre el corpus sintético de test-fixtures/.
import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { LoadedDocument, PdfEngine, TextBlock } from '../engine'
import { createPdfjsEngine } from '../reader/pdfjs-engine'

const FIXTURES = 'test-fixtures/generated'

async function open(file: string): Promise<{ engine: PdfEngine; doc: LoadedDocument }> {
  const engine = createPdfjsEngine(pdfjs)
  const bytes = await readFile(`${FIXTURES}/${file}`)
  const doc = await engine.load(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length),
  )
  return { engine, doc }
}

const texts = (blocks: TextBlock[]) => blocks.map((b) => b.text)

describe('cv-calibri.pdf', () => {
  let engine: PdfEngine
  let lines: TextBlock[]
  let paragraphs: TextBlock[]

  beforeAll(async () => {
    ;({ engine } = await open('cv-calibri.pdf'))
    lines = await engine.getTextBlocks(1, 'line')
    paragraphs = await engine.getTextBlocks(1, 'paragraph')
  })
  afterAll(() => engine.destroy())

  it('arma líneas completas con acentos y ñ', () => {
    expect(texts(lines)).toContain('José Núñez Peña')
    expect(texts(lines)).toContain(
      'Ingeniero de Software — Compañía Ficticia S.A. de C.V. (2022–2025)',
    )
  })

  it('separa la línea en runs por estilo', () => {
    const line = lines.find((l) => l.text.startsWith('Ingeniero de Software'))!
    expect(line.runs.map((r) => [r.text.trim(), r.bold, r.italic])).toEqual([
      ['Ingeniero de Software', true, false],
      ['— Compañía Ficticia S.A. de C.V.', false, false],
      ['(2022–2025)', false, true],
    ])
    expect(line.runs[0]!.fontFamily).toBe('Calibri')
  })

  it('agrupa el párrafo de experiencia sin mezclar el título', () => {
    const para = paragraphs.find((p) => p.text.startsWith('Diseñé y mantuve'))!
    expect(para.kind).toBe('paragraph')
    expect(para.lines!.length).toBeGreaterThan(1)
    expect(para.text).toContain('Mentoría a tres desarrolladores junior.')
    expect(texts(paragraphs)).toContain('Experiencia')
  })
})

describe('dos-columnas-serif.pdf', () => {
  let engine: PdfEngine
  let doc: LoadedDocument
  let lines: TextBlock[]
  let paragraphs: TextBlock[]

  beforeAll(async () => {
    ;({ engine, doc } = await open('dos-columnas-serif.pdf'))
    lines = await engine.getTextBlocks(1, 'line')
    paragraphs = await engine.getTextBlocks(1, 'paragraph')
  })
  afterAll(() => engine.destroy())

  it('une los fragmentos letra por letra y normaliza los acentos', () => {
    expect(texts(lines).some((t) => t.includes('párrafos ni líneas'))).toBe(true)
  })

  it('nunca mezcla las dos columnas en una línea', () => {
    const middle = doc.pages[0]!.width / 2
    for (const line of lines.filter((l) => l.runs[0]!.fontFamily === 'Cambria')) {
      const crosses = line.x < middle - 5 && line.x + line.width > middle + 5
      expect(crosses, line.text).toBe(false)
    }
  })

  it('agrupa cada columna en párrafos propios', () => {
    const middle = doc.pages[0]!.width / 2
    const body = paragraphs.filter((p) => p.kind === 'paragraph')
    expect(body.length).toBeGreaterThanOrEqual(4)
    expect(body.some((p) => p.x > middle)).toBe(true)
  })
})

describe('factura-color.pdf', () => {
  let engine: PdfEngine
  let lines: TextBlock[]

  beforeAll(async () => {
    ;({ engine } = await open('factura-color.pdf'))
    lines = await engine.getTextBlocks(1, 'line')
  })
  afterAll(() => engine.destroy())

  it('separa las celdas de una fila de tabla', () => {
    expect(texts(lines)).toEqual(
      expect.arrayContaining(['Licencia anual de software', '3', '$4,500.00', '$13,500.00']),
    )
  })

  it('detecta la familia Arial', () => {
    const header = lines.find((l) => l.text === 'FACTURA No. F-2025-0187')!
    expect(header.runs[0]).toMatchObject({ fontFamily: 'Arial', bold: true })
  })
})

describe('cv-rotado-90.pdf', () => {
  it('lee la página rotada igual que la original', async () => {
    const rotated = await open('cv-rotado-90.pdf')
    const original = await open('cv-calibri.pdf')
    expect(rotated.doc.pages[0]!.rotate).toBe(90)
    expect(texts(await rotated.engine.getTextBlocks(1, 'line'))).toEqual(
      texts(await original.engine.getTextBlocks(1, 'line')),
    )
    await Promise.all([rotated.engine.destroy(), original.engine.destroy()])
  })
})
