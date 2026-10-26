// Genera PDFs largos combinando el corpus sintético (para uñeros por rango, palabras guía y
// render perezoso). No se versionan: el de 300 páginas pesa ~13 MB.
// Uso: npm run fixtures:long
import { readFile, writeFile } from 'node:fs/promises'
import { PDFDocument } from '@cantoo/pdf-lib'

const DIR = 'test-fixtures/generated'
const sources = await Promise.all(
  ['cv-calibri', 'factura-color', 'dos-columnas-serif'].map(async (name) =>
    PDFDocument.load(await readFile(`${DIR}/${name}.pdf`)),
  ),
)

for (const total of [40, 300]) {
  const out = await PDFDocument.create()
  for (let i = 0; i < total; i++) {
    const [page] = await out.copyPages(sources[i % sources.length], [0])
    out.addPage(page)
  }
  await writeFile(`${DIR}/largo-${total}-paginas.pdf`, await out.save())
  console.log(`${DIR}/largo-${total}-paginas.pdf`)
}
