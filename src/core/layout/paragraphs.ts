// Une líneas consecutivas en párrafos: mismo ángulo, tamaño parecido, interlineado normal y
// solapadas en horizontal (eso evita mezclar columnas o celdas de tabla).
import type { Box, TextBlock } from '../engine'
import { readingOrder, union } from './lines'

export interface ParagraphOptions {
  /** Distancia máxima entre líneas base, en fracciones del tamaño de fuente. */
  maxLineGap: number
  /** Razón máxima entre tamaños de fuente de dos líneas del mismo párrafo. */
  maxSizeRatio: number
  /** Solape horizontal mínimo, como fracción de la línea más corta. */
  minOverlap: number
}

export const DEFAULT_PARAGRAPH_OPTIONS: ParagraphOptions = {
  maxLineGap: 1.6,
  maxSizeRatio: 1.12,
  minOverlap: 0.5,
}

export function groupParagraphs(
  lines: readonly TextBlock[],
  options: ParagraphOptions = DEFAULT_PARAGRAPH_OPTIONS,
): TextBlock[] {
  const paragraphs: TextBlock[][] = []

  for (const line of [...lines].sort((a, b) => b.baseline - a.baseline || a.x - b.x)) {
    let best: TextBlock[] | undefined
    let bestGap = Number.POSITIVE_INFINITY
    for (const para of paragraphs) {
      const last = para.at(-1)!
      const gap = continues(last, line, options)
      if (gap !== null && gap < bestGap) {
        best = para
        bestGap = gap
      }
    }
    if (best) best.push(line)
    else paragraphs.push([line])
  }

  const blocks = paragraphs.map(toParagraph).sort(readingOrder)
  blocks.forEach((block, i) => (block.id = `p${block.page}-b${i}`))
  return blocks
}

/** Distancia entre líneas base si `next` continúa el párrafo de `prev`; null si no. */
function continues(prev: TextBlock, next: TextBlock, options: ParagraphOptions): number | null {
  if (prev.rotation !== next.rotation || prev.rotation !== 0) return null
  const sizePrev = dominantSize(prev)
  const sizeNext = dominantSize(next)
  const ratio = Math.max(sizePrev, sizeNext) / Math.min(sizePrev, sizeNext)
  if (ratio > options.maxSizeRatio) return null

  const gap = prev.baseline - next.baseline
  if (gap <= 0 || gap > options.maxLineGap * sizePrev) return null

  const overlap = Math.min(prev.x + prev.width, next.x + next.width) - Math.max(prev.x, next.x)
  if (overlap < options.minOverlap * Math.min(prev.width, next.width)) return null
  return gap
}

/** Tamaño de fuente que cubre más ancho de la línea. */
function dominantSize(line: TextBlock): number {
  let best = line.runs[0]!
  for (const run of line.runs) if (run.width > best.width) best = run
  return best.fontSize
}

function toParagraph(lines: TextBlock[]): TextBlock {
  const first = lines[0]!
  if (lines.length === 1) return { ...first, id: '' }
  return {
    id: '',
    kind: 'paragraph',
    page: first.page,
    ...lines.reduce<Box>((acc, line) => union(acc, line), first),
    baseline: first.baseline,
    rotation: first.rotation,
    text: lines.map((l) => l.text).join('\n'),
    runs: lines.flatMap((l) => l.runs),
    lines,
  }
}
