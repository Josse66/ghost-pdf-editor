// Corpus real: corre la ida y vuelta sobre cada PDF de test-fixtures/privado/ (CVs, facturas…).
// Esa carpeta no se sube al repo, así que en el CI esto se salta solo. En cada página con texto edita
// un renglón y comprueba lo mismo que con el corpus sintético: el texto viejo desaparece, el nuevo es
// texto, fuera de lo editado no cambia ni un píxel y el reporte no esconde sorpresas.
import { readdir, readFile } from 'node:fs/promises'
import { beforeAll, describe, expect, it } from 'vitest'
import type { TextBlock } from '../engine'
import { createPdfium, type Pdfium } from './erase'
import { exportPdf } from './export'
import { changedOutside, editOf, fonts, open, renderPage, toBuffer } from './test-utils'

// CORPUS_DIR permite correrla sobre otra carpeta (p. ej. el corpus sintético, para probar la prueba).
const DIR = process.env.CORPUS_DIR ?? 'test-fixtures/privado'
/** Páginas por archivo: el corpus real puede traer documentos largos. */
const MAX_PAGES = 3
const MARK = 'Ghost 2026'

const files = (await readdir(DIR).catch(() => [] as string[])).filter((f) => /\.pdf$/i.test(f))

const squash = (s: string) => s.replace(/\s+/g, '')
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1

/** El renglón a editar: una sola línea horizontal, con texto de verdad y una palabra que cambiar. */
function pickBlock(blocks: readonly TextBlock[]): TextBlock | undefined {
  return blocks.find((b) => {
    const words = b.text.trim().split(/\s+/)
    // La última palabra no se repite en el renglón: así se reemplaza justo esa.
    return b.rotation === 0 && !b.lines && words.length >= 3 && count(b.text, words.at(-1)!) === 1
  })
}

describe.skipIf(files.length === 0)('corpus privado (test-fixtures/privado)', () => {
  let pdfium: Pdfium
  beforeAll(async () => {
    const wasm = await readFile('node_modules/@embedpdf/pdfium/dist/pdfium.wasm')
    pdfium = await createPdfium(toBuffer(wasm))
  })

  it.each(files)(
    '%s: edita, exporta y nada más cambia',
    async (file) => {
      const original = new Uint8Array(await readFile(`${DIR}/${file}`))
      const engine = await open(original)
      const { pages } = await engine.load(toBuffer(original))

      for (const info of pages.slice(0, MAX_PAGES)) {
        if (info.rotate !== 0) continue
        const lines = await engine.getTextBlocks(info.page, 'line')
        const block = pickBlock(await engine.getTextBlocks(info.page, 'paragraph'))
        if (!block) continue

        // Cambia la última palabra: el renglón conserva su forma y el cambio es inequívoco.
        const last = block.text.trim().split(/\s+/).at(-1)!
        const edit = editOf(block, last, MARK)
        const { bytes, report } = await exportPdf(
          {
            original,
            edits: [edit],
            blocks: new Map([[block.id, block]]),
            pages,
            pageLines: new Map([[info.page, lines]]),
          },
          { pdfium, fonts },
        )
        const where = `${file}, página ${info.page}: «${block.text}»`
        expect(report.notErased, where).toEqual([])

        const reread = await open(bytes)
        const after = await reread.getTextBlocks(info.page, 'line')
        await reread.destroy()
        const before = squash(lines.map((l) => l.text).join(''))
        const now = squash(after.map((l) => l.text).join(''))
        // El renglón viejo desaparece una vez (puede repetirse en otra parte de la página) y el nuevo es texto.
        expect(count(now, squash(block.text)), where).toBe(count(before, squash(block.text)) - 1)
        expect(now, where).toContain(squash(edit.after))

        const drawn = after.filter((l) => l.text.includes(MARK))
        const scale = 1.5
        const a = await renderPage(original, info.page, scale)
        const b = await renderPage(bytes, info.page, scale)
        const { changed, total } = changedOutside(a, b, info, scale, [block, ...drawn])
        expect(changed / total, where).toBeLessThan(0.0005)
      }
      await engine.destroy()
    },
    120_000,
  )
})
