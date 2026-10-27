import { describe, expect, it } from 'vitest'
import type { TextBlock, TextRun } from '../engine'
import { flowText, runsFromBlock } from './runs'

const run = (text: string, bold = false): TextRun => ({
  text,
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  fontName: bold ? 'AAAAAA+Calibri-Bold' : 'BAAAAA+Calibri',
  fontFamily: 'Calibri',
  generic: 'sans-serif',
  bold,
  italic: false,
  fontSize: 11,
})

const line = (runs: TextRun[]): TextBlock => ({
  id: 'l',
  kind: 'line',
  page: 1,
  x: 0,
  y: 0,
  width: 100,
  height: 12,
  baseline: 0,
  rotation: 0,
  text: runs.map((r) => r.text).join(''),
  runs,
})

const paragraph = (lines: TextBlock[]): TextBlock => ({
  ...line(lines.flatMap((l) => l.runs)),
  id: 'p1-b0',
  kind: 'paragraph',
  text: lines.map((l) => l.text).join('\n'),
  lines,
})

describe('runsFromBlock', () => {
  it('conserva la negrita y une las líneas con un espacio', () => {
    const block = paragraph([
      line([run('Ingeniero de Software', true), run(' — Compañía Ficticia')]),
      line([run('S.A. de C.V.')]),
    ])
    expect(runsFromBlock(block)).toEqual([
      { text: 'Ingeniero de Software', style: 0 },
      { text: ' — Compañía Ficticia S.A. de C.V.', style: 1 },
    ])
  })

  it('une la palabra partida con guion al final de línea', () => {
    const block = paragraph([
      line([run('Efectos de la frag-')]),
      line([run('mentación tipográfica')]),
    ])
    expect(flowText(block)).toBe('Efectos de la fragmentación tipográfica')
  })

  it('no toca un guion que no parte palabra', () => {
    const block = paragraph([line([run('Período 2022 -')]), line([run('2025')])])
    expect(flowText(block)).toBe('Período 2022 - 2025')
  })
})
