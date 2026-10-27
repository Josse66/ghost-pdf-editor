// Spike 4c: la raya (U+2013) se veía corta en el PDF exportado. Resultado: es el diseño de Carlito,
// no el recorte (la fila «full» se veía bien solo porque el WOFF sin convertir rompe la fuente).
import { readFile, writeFile } from 'node:fs/promises'
import { PDFDocument } from '@cantoo/pdf-lib'
import fontkit from '@cantoo/fontkit'

const file = '../node_modules/@fontsource/carlito/files/carlito-latin-400-italic.woff'
const doc = await PDFDocument.create()
doc.registerFontkit(fontkit)
const page = doc.addPage([300, 140])
const bytes = await readFile(file)
for (const [i, subset] of [true, false].entries()) {
  const font = await doc.embedFont(bytes, { subset })
  page.drawText(`(2022–2025) — ${subset ? 'subset' : 'full'}`, { x: 10, y: 100 - i * 40, size: 18, font })
}
await writeFile(process.argv[2], await doc.save())
