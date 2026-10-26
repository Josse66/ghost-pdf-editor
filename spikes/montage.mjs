// Hoja de contactos: junta capturas en una cuadrícula con su nombre. Uso: node montage.mjs out.png cols ancho img1 img2 ...
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { writeFile } from 'node:fs/promises'

const [out, colsArg, cellArg, ...files] = process.argv.slice(2)
const cols = Number(colsArg)
const cellW = Number(cellArg)
const images = await Promise.all(files.map((f) => loadImage(f)))
const cellH = Math.max(...images.map((img) => (img.height * cellW) / img.width)) + 22
const rows = Math.ceil(images.length / cols)
const canvas = createCanvas(cols * cellW + (cols + 1) * 8, rows * cellH + (rows + 1) * 8)
const ctx = canvas.getContext('2d')
ctx.fillStyle = '#888'
ctx.fillRect(0, 0, canvas.width, canvas.height)
images.forEach((img, i) => {
  const x = 8 + (i % cols) * (cellW + 8)
  const y = 8 + Math.floor(i / cols) * (cellH + 8)
  ctx.fillStyle = '#fff'
  ctx.font = '14px sans-serif'
  ctx.fillText(files[i].split(/[\\/]/).pop(), x, y + 14)
  ctx.drawImage(img, x, y + 20, cellW, (img.height * cellW) / img.width)
})
await writeFile(out, canvas.toBuffer('image/png'))
