// Del bloque original al texto que se edita: las líneas de un párrafo se vuelven un texto corrido
// (el editor lo vuelve a cortar por ancho), y la palabra partida con guion al final de línea se une.
import type { TextBlock } from '../engine'
import type { EditedRun } from './history'

/** Runs iniciales del editor; `style` es el índice en `block.runs`. */
export function runsFromBlock(block: TextBlock): EditedRun[] {
  const lines = block.lines ?? [block]
  const runs: EditedRun[] = []
  let styleIndex = 0
  lines.forEach((line, lineIndex) => {
    line.runs.forEach((run, runIndex) => {
      let text = run.text
      const lastOfLine = runIndex === line.runs.length - 1
      const next = lines[lineIndex + 1]
      if (lastOfLine && next) {
        const hyphenated = /[a-záéíóúüñ]-$/i.test(text) && /^[a-záéíóúüñ]/.test(next.text)
        text = hyphenated ? text.slice(0, -1) : text.replace(/\s*$/, ' ')
      }
      const last = runs.at(-1)
      if (last && last.style === styleIndex - 1 && sameStyle(block, styleIndex - 1, styleIndex)) {
        last.text += text
      } else {
        runs.push({ text, style: styleIndex })
      }
      styleIndex++
    })
  })
  return runs
}

/** Texto corrido del bloque: lo que muestra la entrada tachada y contra lo que se compara. */
export function flowText(block: TextBlock): string {
  return runsFromBlock(block)
    .map((r) => r.text)
    .join('')
}

function sameStyle(block: TextBlock, a: number, b: number): boolean {
  const x = block.runs[a]
  const y = block.runs[b]
  return (
    !!x &&
    !!y &&
    x.fontName === y.fontName &&
    Math.abs(x.fontSize - y.fontSize) < 0.1 &&
    x.bold === y.bold &&
    x.italic === y.italic
  )
}
