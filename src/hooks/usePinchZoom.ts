import { useEffect, type RefObject } from 'react'
import { flushSync } from 'react-dom'
import { pinchScale } from '@/lib/zoom'
import { selectScale, useDocument, type Zoom } from '@/store/document'

interface Point {
  x: number
  y: number
}

/** Un punto del documento: la página y su posición en fracciones de la lámina. */
interface Anchor {
  page: number
  fx: number
  fy: number
}

interface Gesture {
  dist: number
  mid: Point
  now: Point
  scale: number
  ratio: number
  anchor: Anchor | null
}

/** Si al soltar quedas a menos de esto de un ajuste, se vuelve a ese ajuste. */
const SNAP = 0.06

const midpoint = (t: TouchList): Point => ({
  x: (t[0]!.clientX + t[1]!.clientX) / 2,
  y: (t[0]!.clientY + t[1]!.clientY) / 2,
})
const distance = (t: TouchList) =>
  Math.hypot(t[0]!.clientX - t[1]!.clientX, t[0]!.clientY - t[1]!.clientY)

const sheetOf = (root: HTMLElement, page: number) =>
  root.querySelector<HTMLElement>(`[data-page="${page}"] [data-sheet]`)

/** La lámina más cercana al punto, y dónde cae el punto dentro de ella. */
function anchorAt(root: HTMLElement, p: Point): Anchor | null {
  let best: { page: number; rect: DOMRect; gap: number } | null = null
  for (const sheet of root.querySelectorAll<HTMLElement>('[data-sheet]')) {
    const rect = sheet.getBoundingClientRect()
    const gap = p.y < rect.top ? rect.top - p.y : p.y > rect.bottom ? p.y - rect.bottom : 0
    if (!best || gap < best.gap) {
      const page = Number(sheet.closest<HTMLElement>('[data-page]')?.dataset.page)
      best = { page, rect, gap }
    }
  }
  if (!best) return null
  const { rect, page } = best
  return { page, fx: (p.x - rect.left) / rect.width, fy: (p.y - rect.top) / rect.height }
}

/**
 * Pellizcar para hacer zoom solo en el documento. El navegador ya no hace zoom ahí (el visor
 * declara `touch-action: pan-x pan-y`); la cabeza y las columnas no se mueven. Durante el gesto
 * la lámina se escala con transform (barato); al soltar se fija el zoom real, se vuelve a dibujar
 * nítida y el punto bajo los dedos se queda donde estaba.
 */
export function usePinchZoom(
  rootRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const root = rootRef.current
    const content = contentRef.current
    if (!root || !content) return
    let gesture: Gesture | null = null

    const reset = () => {
      content.style.transform = ''
      content.style.transformOrigin = ''
      content.style.willChange = ''
    }

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      const mid = midpoint(e.touches)
      const box = content.getBoundingClientRect()
      gesture = {
        dist: distance(e.touches),
        mid,
        now: mid,
        scale: selectScale(useDocument.getState()),
        ratio: 1,
        anchor: anchorAt(root, mid),
      }
      content.style.transformOrigin = `${mid.x - box.left}px ${mid.y - box.top}px`
      content.style.willChange = 'transform'
    }

    const onMove = (e: TouchEvent) => {
      if (!gesture || e.touches.length !== 2) return
      // Dos dedos son nuestros: que el navegador no desplace el visor al mismo tiempo.
      if (e.cancelable) e.preventDefault()
      const now = midpoint(e.touches)
      const { fit } = useDocument.getState()
      const target = pinchScale((gesture.scale * distance(e.touches)) / gesture.dist, fit.page)
      gesture.ratio = target / gesture.scale
      gesture.now = now
      content.style.transform = `translate(${now.x - gesture.mid.x}px, ${now.y - gesture.mid.y}px) scale(${gesture.ratio})`
    }

    const onEnd = (e: TouchEvent) => {
      if (!gesture || e.touches.length >= 2) return
      const g = gesture
      gesture = null
      reset()
      if (Math.abs(g.ratio - 1) < 0.01) return

      const state = useDocument.getState()
      const target = g.scale * g.ratio
      const near = (fit: number) => Math.abs(target - fit) / fit < SNAP
      const zoom: Zoom = near(state.fit.page) ? 'page' : near(state.fit.width) ? 'width' : target
      // Síncrono: hay que medir las láminas ya con su tamaño nuevo para acomodar el scroll.
      flushSync(() => state.setZoom(zoom))

      const sheet = g.anchor && sheetOf(root, g.anchor.page)
      if (!g.anchor || !sheet) return
      const rect = sheet.getBoundingClientRect()
      root.scrollLeft += rect.left + g.anchor.fx * rect.width - g.now.x
      root.scrollTop += rect.top + g.anchor.fy * rect.height - g.now.y
    }

    // Safari tiene su propio gesto de zoom; dentro del visor el pellizco es nuestro.
    const stopSafariZoom = (e: Event) => e.preventDefault()

    root.addEventListener('touchstart', onStart, { passive: true })
    root.addEventListener('touchmove', onMove, { passive: false })
    root.addEventListener('touchend', onEnd)
    root.addEventListener('touchcancel', onEnd)
    root.addEventListener('gesturestart', stopSafariZoom)
    return () => {
      reset()
      root.removeEventListener('touchstart', onStart)
      root.removeEventListener('touchmove', onMove)
      root.removeEventListener('touchend', onEnd)
      root.removeEventListener('touchcancel', onEnd)
      root.removeEventListener('gesturestart', stopSafariZoom)
    }
  }, [rootRef, contentRef])
}
