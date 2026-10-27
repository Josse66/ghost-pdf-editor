// Ayudas de prueba (Node) para la exportación: gemelas desde node_modules, abrir con pdf.js, editar
// como el editor, renderizar y comparar píxeles fuera de lo editado. No viaja en la app.
import { readdir, readFile } from 'node:fs/promises'
import { createCanvas } from '@napi-rs/canvas'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { BlockEdit } from '../edits/history'
import { runsFromBlock } from '../edits/runs'
import type { Box, PageInfo, PdfEngine, TextBlock } from '../engine'
import { createPdfjsEngine } from '../reader/pdfjs-engine'
import type { FontSource } from './fonts'
import { toScreenRect, viewportTransform } from '../geometry'

/** Las gemelas de Fontsource en el mismo orden que el worker: latin, latin-ext y luego el resto. */
export const fonts: FontSource = async (family, bold, italic) => {
  const name = family.toLowerCase()
  const dir = `node_modules/@fontsource/${name}/files`
  const suffix = `-${bold ? 700 : 400}-${italic ? 'italic' : 'normal'}.woff`
  const rank = (file: string) => {
    const subset = file.slice(name.length + 1, -suffix.length)
    const i = ['latin', 'latin-ext'].indexOf(subset)
    return i === -1 ? 2 : i
  }
  const files = (await readdir(dir))
    .filter((f) => f.endsWith(suffix))
    .sort((a, b) => rank(a) - rank(b))
  return Promise.all(files.map((f) => readFile(`${dir}/${f}`)))
}

export const toBuffer = (bytes: Uint8Array) =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer

export async function open(bytes: Uint8Array): Promise<PdfEngine> {
  const engine = createPdfjsEngine(pdfjs)
  await engine.load(toBuffer(bytes))
  return engine
}

/** Edita un bloque como lo haría el editor: reemplaza texto dentro de sus runs y de sus líneas. */
export function editOf(block: TextBlock, find: string, replace: string): BlockEdit {
  const runs = runsFromBlock(block).map((r) => ({ ...r, text: r.text.replace(find, replace) }))
  const lines = (block.lines ?? [block]).map((l) => l.text.replace(find, replace))
  return {
    blockId: block.id,
    page: block.page,
    before: block.text,
    after: runs.map((r) => r.text).join(''),
    runs,
    lines,
  }
}

export interface Raster {
  width: number
  height: number
  data: Uint8ClampedArray
}

export async function renderPage(bytes: Uint8Array, page: number, scale: number): Promise<Raster> {
  // pdf.js 6: se destruye la tarea de carga, el documento ya no tiene destroy().
  const task = pdfjs.getDocument({ data: bytes.slice() })
  const doc = await task.promise
  try {
    const p = await doc.getPage(page)
    const viewport = p.getViewport({ scale })
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
    const context = canvas.getContext('2d')
    await p.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
    return { width: canvas.width, height: canvas.height, data }
  } finally {
    await task.destroy()
  }
}

/** Píxeles que cambiaron fuera de las zonas (cajas en puntos PDF, con un margen de `pad` puntos). */
export function changedOutside(
  a: Raster,
  b: Raster,
  info: PageInfo,
  scale: number,
  zones: readonly Box[],
  pad = 2,
): { changed: number; total: number } {
  if (a.width !== b.width || a.height !== b.height)
    throw new Error('Las páginas no miden lo mismo.')
  const matrix = viewportTransform(info.view, info.rotate, scale)
  const masks = zones.map((z) =>
    toScreenRect(matrix, {
      x: z.x - pad,
      y: z.y - pad,
      width: z.width + 2 * pad,
      height: z.height + 2 * pad,
    }),
  )
  const masked = (x: number, y: number) =>
    masks.some((m) => x >= m.left && x <= m.left + m.width && y >= m.top && y <= m.top + m.height)

  let changed = 0
  let total = 0
  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
      if (masked(x, y)) continue
      total++
      const i = (y * a.width + x) * 4
      // Tolerancia de antialias: una diferencia leve en un canal no es un cambio visible.
      const d = Math.max(
        Math.abs(a.data[i]! - b.data[i]!),
        Math.abs(a.data[i + 1]! - b.data[i + 1]!),
        Math.abs(a.data[i + 2]! - b.data[i + 2]!),
      )
      if (d > 48) changed++
    }
  }
  return { changed, total }
}
