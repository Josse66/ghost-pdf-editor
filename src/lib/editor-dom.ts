// Lectura del editor en sitio (contenteditable). El DOM manda mientras se escribe; React solo pinta
// el contenido inicial y, al confirmar, esto lo convierte de vuelta en runs y líneas.
import type { EditedRun } from '@/core/edits/history'

/** Runs del editor: cada tramo hereda el estilo del span `data-style` que lo contiene. */
export function readRuns(root: HTMLElement): EditedRun[] {
  const runs: EditedRun[] = []
  let style = 0
  const push = (text: string) => {
    if (!text) return
    const last = runs.at(-1)
    if (last && last.style === style) last.text += text
    else runs.push({ text, style })
  }
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      push(node.textContent ?? '')
      return
    }
    if (node.nodeName === 'BR') {
      push('\n')
      return
    }
    if (node instanceof HTMLElement && node.dataset.style !== undefined)
      style = Number(node.dataset.style)
    node.childNodes.forEach(walk)
  }
  root.childNodes.forEach(walk)
  // El navegador agrega un <br> final de relleno en contenteditable; no es texto del usuario.
  const last = runs.at(-1)
  if (last?.text.endsWith('\n')) last.text = last.text.slice(0, -1)
  return runs.filter((r) => r.text.length > 0)
}

/**
 * Líneas tal como el navegador las cortó en pantalla (incluye los saltos que hizo por ancho).
 * La exportación las respeta, así el PDF se ve igual que el editor.
 */
export function measureLines(root: HTMLElement): string[] {
  const lines: string[] = []
  let current = ''
  let top = Number.NaN
  const range = document.createRange()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeName === 'BR') {
      lines.push(current)
      current = ''
      top = Number.NaN
      continue
    }
    if (node.nodeType !== Node.TEXT_NODE) continue
    const text = node.textContent ?? ''
    for (let i = 0; i < text.length; i++) {
      range.setStart(node, i)
      range.setEnd(node, i + 1)
      const rect = range.getClientRects()[0]
      if (rect && !Number.isNaN(top) && rect.top > top + rect.height / 2) {
        lines.push(current.trimEnd())
        current = ''
      }
      if (rect) top = Number.isNaN(top) || rect.top > top + rect.height / 2 ? rect.top : top
      current += text[i]
    }
  }
  if (current || !lines.length) lines.push(current.trimEnd())
  return lines
}

/** Coloca el cursor en el punto de pantalla (donde el usuario hizo doble clic o tocó). */
export function placeCaretAt(x: number, y: number): boolean {
  const selection = window.getSelection()
  if (!selection) return false
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  }
  // caretPositionFromPoint es el estándar (Firefox, Chrome 128+); caretRangeFromPoint, el de WebKit.
  let range: Range | null = null
  const position = doc.caretPositionFromPoint?.(x, y)
  if (position) {
    range = document.createRange()
    range.setStart(position.offsetNode, position.offset)
    range.collapse(true)
  } else {
    range = document.caretRangeFromPoint?.(x, y) ?? null
  }
  if (!range) return false
  selection.removeAllRanges()
  selection.addRange(range)
  return true
}

/** Distancia desde el borde superior del elemento hasta la línea base de su primera línea. */
export function measureBaseline(root: HTMLElement): number {
  const marker = document.createElement('span')
  marker.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
  const firstText = root.querySelector('[data-style]') ?? root
  firstText.prepend(marker)
  const offset = marker.getBoundingClientRect().top - root.getBoundingClientRect().top
  marker.remove()
  return offset
}
