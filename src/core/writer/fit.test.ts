import { describe, expect, it } from 'vitest'
import type { BlockEdit } from '../edits/history'
import type { TextBlock, TextRun } from '../engine'
import { freeRight, guessAlign, MIN_SQUEEZE, planBlock, splitIntoLines } from './fit'

function line(id: string, x: number, baseline: number, width: number, text = 'x'): TextBlock {
  const run: TextRun = {
    text,
    x,
    y: baseline - 3,
    width,
    height: 12,
    fontName: 'Calibri',
    fontFamily: 'Calibri',
    generic: 'sans-serif',
    bold: false,
    italic: false,
    fontSize: 10,
  }
  return {
    id,
    kind: 'line',
    page: 1,
    x,
    y: baseline - 3,
    width,
    height: 12,
    baseline,
    rotation: 0,
    text,
    runs: [run],
  }
}

const edit = (after: string, lines: string[]): BlockEdit => ({
  blockId: 'b',
  page: 1,
  before: '',
  after,
  runs: [{ text: after, style: 0 }],
  lines,
})

/** Cada carácter mide 5 pt. */
const measure = (run: { text: string }) => run.text.length * 5

describe('splitIntoLines', () => {
  it('reparte runs con estilos en las líneas cortadas, sin el espacio del corte', () => {
    const runs = [
      { text: 'Hola ', style: 0 },
      { text: 'mundo grande', style: 1 },
    ]
    expect(splitIntoLines(runs, ['Hola mundo', 'grande'])).toEqual([
      [
        { text: 'Hola ', style: 0 },
        { text: 'mundo', style: 1 },
      ],
      [{ text: 'grande', style: 1 }],
    ])
  })

  it('respeta los saltos de línea explícitos', () => {
    expect(splitIntoLines([{ text: 'a\nb', style: 0 }], ['a', 'b'])).toEqual([
      [{ text: 'a', style: 0 }],
      [{ text: 'b', style: 0 }],
    ])
  })
})

describe('planBlock', () => {
  const block = line('l0', 100, 700, 50)

  it('si cabe en el espacio libre, no aprieta ni achica', () => {
    const plan = planBlock(edit('x'.repeat(20), ['x'.repeat(20)]), block, measure, {
      right: 300,
      align: 'left',
    })
    expect(plan.lines[0]).toMatchObject({ x: 100, baseline: 700, squeeze: 1, shrink: 1 })
    expect(plan.squeezed || plan.shrunk || plan.overflow).toBe(false)
  })

  it('aprieta hasta 85 % antes de achicar', () => {
    // 100 pt de texto en 90 pt de espacio: apretar al 90 % basta.
    const plan = planBlock(edit('x'.repeat(20), ['x'.repeat(20)]), block, measure, {
      right: 190,
      align: 'left',
    })
    expect(plan.lines[0]!.squeeze).toBeCloseTo(0.9)
    expect(plan.lines[0]!.shrink).toBe(1)
    expect(plan.squeezed).toBe(true)
  })

  it('achica solo lo que falta después de apretar al máximo', () => {
    // 100 pt en 68 pt: 85 % deja 85 pt; falta achicar a 68/85.
    const plan = planBlock(edit('x'.repeat(20), ['x'.repeat(20)]), block, measure, {
      right: 168,
      align: 'left',
    })
    expect(plan.lines[0]!.squeeze).toBe(MIN_SQUEEZE)
    expect(plan.lines[0]!.shrink).toBeCloseTo(68 / 85)
    expect(plan.shrunk).toBe(true)
  })

  it('las líneas de más bajan con el interlineado del párrafo', () => {
    const para: TextBlock = {
      ...line('b', 100, 700, 50),
      kind: 'paragraph',
      lines: [line('l0', 100, 700, 50), line('l1', 100, 686, 50)],
    }
    const plan = planBlock(edit('a b c', ['a', 'b', 'c']), para, measure, {
      right: 300,
      align: 'left',
    })
    expect(plan.lines.map((l) => l.baseline)).toEqual([700, 686, 672])
    expect(plan.overflow).toBe(true)
  })

  it('un título centrado sigue centrado aunque cambie de largo', () => {
    const title = line('t', 250, 700, 100)
    const plan = planBlock(edit('x'.repeat(10), ['x'.repeat(10)]), title, measure, {
      right: 500,
      align: 'center',
    })
    expect(plan.lines[0]!.x).toBe(300 - 25)
  })
})

describe('freeRight', () => {
  it('se detiene antes del texto que sigue en el mismo renglón', () => {
    const own = line('l0', 50, 700, 100)
    const date = line('l1', 400, 700, 60)
    const below = line('l2', 50, 680, 480)
    expect(freeRight(own, [own, date, below])).toBe(400 - 5)
  })

  it('sin nadie a la derecha, llega al margen del texto de la página', () => {
    const own = line('l0', 50, 700, 100)
    const wide = line('l1', 50, 680, 480)
    expect(freeRight(own, [own, wide])).toBe(530)
  })
})

describe('guessAlign', () => {
  it('reconoce un título centrado y deja a la izquierda lo demás', () => {
    expect(guessAlign(line('t', 256, 700, 100), 0, 612)).toBe('center')
    expect(guessAlign(line('t', 50, 700, 100), 0, 612)).toBe('left')
  })
})
