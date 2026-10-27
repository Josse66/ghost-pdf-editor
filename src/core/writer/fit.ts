// Dónde y cómo se dibuja cada línea del texto editado. Puro: sin PDF ni fuentes, solo medidas.
// Las líneas llegan ya cortadas por el editor (lo que ves es lo que sale); aquí se decide, línea
// por línea, cómo cabe: espacio libre a la derecha → apretar con Tz hasta 85 % → achicar la letra
// solo como último recurso (Spike 2: el texto más chico al lado del normal se nota).
import type { BlockEdit, EditedRun } from '../edits/history'
import type { TextBlock } from '../engine'

/** Lo menos que se aprieta el texto en horizontal antes de achicarlo. */
export const MIN_SQUEEZE = 0.85

export type Align = 'left' | 'center'

/** Ancho de un tramo a su tamaño original, en puntos. */
export type Measure = (run: EditedRun) => number

export interface PlannedLine {
  /** Inicio de la línea y su línea base, en puntos PDF. */
  x: number
  baseline: number
  runs: EditedRun[]
  /** Escala horizontal (Tz) y factor de tamaño: 1 = sin tocar. */
  squeeze: number
  shrink: number
}

export interface BlockPlan {
  lines: PlannedLine[]
  /** Hubo que apretar, achicar o agregar líneas abajo de las originales. */
  squeezed: boolean
  shrunk: boolean
  overflow: boolean
}

/** Reparte los runs del texto nuevo en las líneas que cortó el editor. */
export function splitIntoLines(
  runs: readonly EditedRun[],
  lines: readonly string[],
): EditedRun[][] {
  const chars = runs.flatMap((run) => [...run.text].map((ch) => ({ ch, style: run.style })))
  let p = 0
  return lines.map((line) => {
    // Entre línea y línea se quedan el salto o el espacio donde el editor cortó.
    while (p < chars.length && chars[p]!.ch !== line[0] && /\s/.test(chars[p]!.ch)) p++
    const out: EditedRun[] = []
    for (const ch of line) {
      const style = chars[p]?.ch === ch ? chars[p++]!.style : (out.at(-1)?.style ?? 0)
      const last = out.at(-1)
      if (last && last.style === style) last.text += ch
      else out.push({ text: ch, style })
    }
    return out
  })
}

/** Centrado: una sola línea cuyo centro coincide con el de la página. */
export function guessAlign(block: TextBlock, pageLeft: number, pageWidth: number): Align {
  if (block.lines && block.lines.length > 1) return 'left'
  const center = block.x + block.width / 2
  const pageCenter = pageLeft + pageWidth / 2
  const offCenter = Math.abs(center - pageCenter) < 0.02 * pageWidth
  const indented = block.x - pageLeft > 0.15 * pageWidth
  return offCenter && indented ? 'center' : 'left'
}

/**
 * Hasta dónde puede crecer el bloque a la derecha sin pisar a nadie: el siguiente texto en sus
 * renglones (otra columna, una fecha alineada a la derecha) o, si no hay, el margen del texto.
 */
export function freeRight(block: TextBlock, pageLines: readonly TextBlock[]): number {
  const own = block.lines ?? [block]
  const ownIds = new Set(own.map((l) => l.id))
  const blockRight = block.x + block.width
  let limit = Math.max(blockRight, ...pageLines.map((l) => l.x + l.width))
  for (const line of own) {
    const lineRight = line.x + line.width
    const size = Math.max(...line.runs.map((r) => r.fontSize))
    for (const other of pageLines) {
      if (ownIds.has(other.id) || other.x < lineRight - 1) continue
      const overlap =
        Math.min(line.y + line.height, other.y + other.height) - Math.max(line.y, other.y)
      if (overlap > 0.5 * Math.min(line.height, other.height))
        limit = Math.min(limit, other.x - 0.5 * size)
    }
  }
  return Math.max(limit, blockRight)
}

export function planBlock(
  edit: BlockEdit,
  block: TextBlock,
  measure: Measure,
  options: { right: number; align: Align },
): BlockPlan {
  const original = block.lines ?? [block]
  const texts = edit.lines.length ? edit.lines : edit.after.split('\n')
  const split = splitIntoLines(edit.runs, texts)
  const first = original[0]!
  const last = original.at(-1)!
  const size = Math.max(...block.runs.map((r) => r.fontSize))
  // Renglones extra (el texto creció): siguen el interlineado del párrafo.
  const pitch =
    original.length > 1 ? (first.baseline - last.baseline) / (original.length - 1) : size * 1.2

  let squeezed = false
  let shrunk = false
  const lines = split.map((runs, i): PlannedLine => {
    const source = original[Math.min(i, original.length - 1)]!
    const extra = i - (original.length - 1)
    const baseline = extra > 0 ? last.baseline - pitch * extra : source.baseline
    const width = runs.reduce((sum, run) => sum + measure(run), 0)
    const center = block.x + block.width / 2
    const room =
      options.align === 'center' ? 2 * (options.right - center) : options.right - source.x

    let squeeze = 1
    let shrink = 1
    if (width > room && width > 0) {
      squeeze = Math.max(MIN_SQUEEZE, room / width)
      if (width * squeeze > room) shrink = room / (width * squeeze)
    }
    squeezed ||= squeeze < 1
    shrunk ||= shrink < 1
    const drawn = width * squeeze * shrink
    const x = options.align === 'center' ? center - drawn / 2 : source.x
    return { x, baseline, runs, squeeze, shrink }
  })

  return { lines, squeezed, shrunk, overflow: split.length > original.length }
}
