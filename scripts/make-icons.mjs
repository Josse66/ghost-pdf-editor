// Íconos de la PWA: todos salen de public/favicon.svg (la hoja con su sombra larga sobre concreto).
// Uso: node scripts/make-icons.mjs  → public/pwa-192.png, pwa-512.png, pwa-maskable-512.png, apple-touch-icon.png
import { readFile, writeFile } from 'node:fs/promises'
import { createCanvas, loadImage } from '@napi-rs/canvas'

const svg = await readFile('public/favicon.svg')
const image = await loadImage(svg)
const CONCRETE = '#e4e3df'

async function render(file, size, inset = 0) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  // El ícono «maskable» deja aire alrededor: Android lo recorta en círculo o en gota.
  ctx.fillStyle = CONCRETE
  ctx.fillRect(0, 0, size, size)
  const pad = size * inset
  ctx.drawImage(image, pad, pad, size - 2 * pad, size - 2 * pad)
  await writeFile(`public/${file}`, canvas.toBuffer('image/png'))
}

await render('pwa-192.png', 192)
await render('pwa-512.png', 512)
await render('pwa-maskable-512.png', 512, 0.1)
await render('apple-touch-icon.png', 180)
console.log('ok')
