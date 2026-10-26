// Agrupa fragmentos sueltos en líneas: mismo ángulo, misma línea base y sin huecos de columna.
// Todo se calcula en el espacio del texto (u a lo largo, v a lo ancho) para soportar texto rotado.
import type { Box, TextBlock, TextRun } from '../engine'
import type { TextFragment } from '../reader/fragments'

export interface LineOptions {
  /** Diferencia máxima de línea base, en fracciones del tamaño de fuente. */
  baselineTolerance: number
  /** Hueco que parte una línea (columnas, celdas de tabla), en fracciones del tamaño de fuente. */
  splitGap: number
  /** Hueco a partir del cual se inserta un espacio entre fragmentos. */
  spaceGap: number
}

export const DEFAULT_LINE_OPTIONS: LineOptions = {
  baselineTolerance: 0.3,
  splitGap: 1.5,
  spaceGap: 0.2,
}

interface Placed {
  frag: TextFragment
  /** Inicio y fin a lo largo del texto. */
  u0: number
  u1: number
  /** Línea base a lo ancho (crece hacia arriba). */
  v: number
}

export function groupLines(
  fragments: readonly TextFragment[],
  page: number,
  options: LineOptions = DEFAULT_LINE_OPTIONS,
): TextBlock[] {
  const byAngle = new Map<number, Placed[]>()
  for (const frag of fragments) {
    const rad = (frag.rotation * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const u0 = frag.x * cos + frag.baseline * sin
    const placed = { frag, u0, u1: u0 + frag.width, v: -frag.x * sin + frag.baseline * cos }
    const group = byAngle.get(frag.rotation)
    if (group) group.push(placed)
    else byAngle.set(frag.rotation, [placed])
  }

  const lines: TextBlock[] = []
  for (const [rotation, group] of byAngle) {
    for (const cluster of clusterByBaseline(group, options)) {
      for (const segment of splitByGaps(cluster, options)) {
        lines.push(toLine(segment, rotation, page, options))
      }
    }
  }

  lines.sort(readingOrder)
  lines.forEach((line, i) => (line.id = `p${page}-l${i}`))
  return lines
}

function clusterByBaseline(group: Placed[], options: LineOptions): Placed[][] {
  const sorted = [...group].sort((p, q) => q.v - p.v || p.u0 - q.u0)
  const clusters: Placed[][] = []
  let current: Placed[] = []
  let anchor = Number.NaN
  for (const p of sorted) {
    if (current.length && Math.abs(p.v - anchor) <= options.baselineTolerance * p.frag.fontSize) {
      current.push(p)
    } else {
      if (current.length) clusters.push(current)
      current = [p]
      anchor = p.v
    }
  }
  if (current.length) clusters.push(current)
  return clusters
}

function splitByGaps(cluster: Placed[], options: LineOptions): Placed[][] {
  const sorted = [...cluster].sort((p, q) => p.u0 - q.u0)
  const segments: Placed[][] = []
  let current: Placed[] = []
  let end = Number.NEGATIVE_INFINITY
  for (const p of sorted) {
    const gap = p.u0 - end
    if (current.length && gap > options.splitGap * p.frag.fontSize) {
      segments.push(current)
      current = []
    }
    current.push(p)
    end = Math.max(end, p.u1)
  }
  if (current.length) segments.push(current)
  return segments
}

function toLine(
  segment: Placed[],
  rotation: number,
  page: number,
  options: LineOptions,
): TextBlock {
  const runs: TextRun[] = []
  let text = ''
  let prevEnd = Number.NaN

  for (const { frag, u0, u1 } of segment) {
    const needsSpace =
      text.length > 0 &&
      u0 - prevEnd > options.spaceGap * frag.fontSize &&
      !/\s$/.test(text) &&
      !/^\s/.test(frag.text)
    const piece = (needsSpace ? ' ' : '') + frag.text
    text += piece
    prevEnd = u1

    const last = runs.at(-1)
    const box = fragmentBox(frag)
    if (last && sameStyle(last, frag)) {
      last.text += piece
      Object.assign(last, union(last, box))
    } else {
      runs.push({
        ...box,
        text: frag.text,
        fontName: frag.fontName,
        fontFamily: frag.fontFamily,
        bold: frag.bold,
        italic: frag.italic,
        fontSize: frag.fontSize,
      })
      // El espacio va al run anterior para que cada run empiece en su primer carácter visible.
      if (needsSpace && last) last.text += ' '
    }
  }

  const first = segment[0]!.frag
  return {
    id: '',
    kind: 'line',
    page,
    ...runs.reduce<Box>((acc, run) => union(acc, run), runs[0]!),
    baseline: first.baseline,
    rotation,
    text,
    runs,
  }
}

function sameStyle(run: TextRun, frag: TextFragment): boolean {
  return run.fontName === frag.fontName && Math.abs(run.fontSize - frag.fontSize) < 0.1
}

/** Caja alineada a los ejes que cubre el fragmento (rotado o no). */
export function fragmentBox(frag: TextFragment): Box {
  const rad = (frag.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const top = frag.ascent * frag.fontSize
  const bottom = frag.descent * frag.fontSize
  const corners = [
    [0, bottom],
    [frag.width, bottom],
    [frag.width, top],
    [0, top],
  ].map(([du = 0, dv = 0]) => [frag.x + du * cos - dv * sin, frag.baseline + du * sin + dv * cos])
  const xs = corners.map((c) => c[0]!)
  const ys = corners.map((c) => c[1]!)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

export function union(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  }
}

/** De arriba hacia abajo y de izquierda a derecha (en PDF la y crece hacia arriba). */
export function readingOrder(a: Box, b: Box): number {
  const ta = a.y + a.height
  const tb = b.y + b.height
  return Math.abs(ta - tb) > 1 ? tb - ta : a.x - b.x
}
