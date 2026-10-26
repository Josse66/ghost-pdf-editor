import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { applyMatrix, toScreenRect, viewportTransform, type ViewBox } from './geometry'

describe('viewportTransform', () => {
  it('voltea el eje y en una página sin rotar', () => {
    const m = viewportTransform([0, 0, 612, 792], 0, 2)
    expect(applyMatrix(m, 0, 792)).toEqual([0, 0])
    expect(applyMatrix(m, 612, 0)).toEqual([1224, 1584])
  })

  it('respeta un CropBox desplazado', () => {
    const m = viewportTransform([50, 100, 350, 500], 0, 1)
    expect(applyMatrix(m, 50, 500)).toEqual([0, 0])
  })

  it('convierte una caja en un rectángulo de pantalla', () => {
    const m = viewportTransform([0, 0, 612, 792], 0, 1)
    expect(toScreenRect(m, { x: 72, y: 700, width: 100, height: 20 })).toEqual({
      left: 72,
      top: 72,
      width: 100,
      height: 20,
    })
  })

  // La referencia es pdf.js: si coincidimos con su viewport, el overlay calza con el canvas.
  it.each([0, 90, 180, 270])('coincide con pdf.js con rotación %i°', async (rotate) => {
    const bytes = await readFile('test-fixtures/generated/cv-calibri.pdf')
    const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise
    const page = await doc.getPage(1)
    const viewport = page.getViewport({ scale: 1.5, rotation: rotate })
    const m = viewportTransform(page.view as unknown as ViewBox, rotate, 1.5)
    for (const [x, y] of [
      [0, 0],
      [63.75, 705.75],
      [612, 792],
    ] as const) {
      const [ex, ey] = viewport.convertToViewportPoint(x, y)
      const [ax, ay] = applyMatrix(m, x, y)
      expect(ax).toBeCloseTo(ex, 6)
      expect(ay).toBeCloseTo(ey, 6)
    }
    await doc.loadingTask.destroy()
  })
})
