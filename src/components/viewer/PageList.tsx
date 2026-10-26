import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { LoadedDocument } from '@/core/engine'
import { fitWidthScale } from '@/lib/zoom'
import { selectScale, useDocument } from '@/store/document'
import { Page } from './Page'

/** Borde y relleno de la lámina a cada lado. */
const PLATE_CHROME = 2 * (1.5 + 8)
/** Aire extra a los lados en pantallas anchas, para que la lámina no toque las columnas. */
const WIDE_AIR = 48

export function PageList({ doc }: { doc: LoadedDocument }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const scale = useDocument(selectScale)
  const debug = useDocument((s) => s.debug)
  const setFitScale = useDocument((s) => s.setFitScale)
  const setVisible = useDocument((s) => s.setVisible)
  const fileName = useDocument((s) => s.fileName)
  const [near, setNear] = useState<ReadonlySet<number>>(() => new Set([1, 2]))
  /** Ancho disponible para el contenido de una lámina, en px CSS. */
  const [available, setAvailable] = useState(Number.POSITIVE_INFINITY)

  // Ajustar al ancho de la página típica (la mediana): en un PDF con tamaños mezclados, una sola
  // página apaisada no encoge todas las demás; esa página se reduce sola para caber (ver Page).
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const widths = doc.pages.map((p) => p.width).sort((a, b) => a - b)
    const typical = widths[Math.floor(widths.length / 2)]!
    const measure = () => {
      const style = getComputedStyle(el)
      const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      const air = el.clientWidth > 720 ? WIDE_AIR : 0
      const room = el.clientWidth - padding - PLATE_CHROME - air
      setAvailable(room)
      setFitScale(fitWidthScale(room, typical))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [doc, setFitScale])

  // Dos observadores: uno amplio decide qué páginas se dibujan; otro exacto alimenta las palabras guía.
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const figures = [...root.querySelectorAll<HTMLElement>('[data-page]')]
    const pageOf = (el: Element) => Number((el as HTMLElement).dataset.page)

    const nearObserver = new IntersectionObserver(
      (entries) =>
        setNear((prev) => {
          const next = new Set(prev)
          for (const e of entries) {
            if (e.isIntersecting) next.add(pageOf(e.target))
            else next.delete(pageOf(e.target))
          }
          return next
        }),
      { root, rootMargin: '150% 0px' },
    )

    const ratios = new Map<number, number>()
    const visibleObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          ratios.set(pageOf(e.target), e.isIntersecting ? e.intersectionRatio : 0)
        const shown = [...ratios].filter(([, r]) => r > 0).map(([p]) => p)
        if (!shown.length) return
        const current = [...ratios].reduce((a, b) => (b[1] > a[1] ? b : a))[0]
        setVisible(Math.min(...shown), Math.max(...shown), current)
      },
      { root, threshold: [0, 0.25, 0.5, 0.75, 1] },
    )

    for (const f of figures) {
      nearObserver.observe(f)
      visibleObserver.observe(f)
    }
    return () => {
      nearObserver.disconnect()
      visibleObserver.disconnect()
    }
  }, [doc, setVisible])

  return (
    <div
      ref={scrollRef}
      tabIndex={-1}
      data-scroll-root
      className="h-full overflow-auto overscroll-contain px-3 py-6 outline-none sm:px-6"
    >
      <div className="flex flex-col gap-8 pb-[30vh]">
        {doc.pages.map((info) => (
          <Page
            key={info.page}
            info={info}
            scale={scale}
            maxWidth={available}
            near={near.has(info.page)}
            fileName={info.page === 1 ? (fileName ?? undefined) : undefined}
            debug={debug}
          />
        ))}
      </div>
    </div>
  )
}
