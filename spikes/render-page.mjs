// Renderiza la página 1 de un PDF a PNG. Uso: node render-page.mjs entrada.pdf salida.png [escala]
import { readFile, writeFile } from 'node:fs/promises'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createCanvas } from '@napi-rs/canvas'

const [input, output, scale = '2'] = process.argv.slice(2)
const doc = await pdfjs.getDocument({ data: new Uint8Array(await readFile(input)) }).promise
const page = await doc.getPage(1)
const viewport = page.getViewport({ scale: Number(scale) })
const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise
await writeFile(output, canvas.toBuffer('image/png'))
