import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { LoadedDocument } from '@/core/engine'
import { usePinchZoom } from '@/hooks/usePinchZoom'
import { fitScale } from '@/lib/zoom'
import { selectScale, useDocument } from '@/store/document'
import { EditHint } from '@/components/editor/EditHint'
import { ExportNotice } from '@/components/editor/ExportNotice'
import { Page } from './Page'

/** Aire que se reserva a los lados de la lámina para que su sombra larga quepa al ajustar. */
const PLATE_CHROME = 2 * 12
/** Alto del pie de lámina («Página n») con su margen, para que ajustar a página lo incluya. */
const CAPTION = 28
/** Aire extra a los lados en pantallas anchas, para que la lámina no toque las columnas. */
const WIDE_AIR = 48

export function PageList({ doc }: { doc: LoadedDocument }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sheetsRef = useRef<HTMLDivElement>(null)
  const scale = useDocument(selectScale)
  // Con zoom manual la lámina puede pasarse del ancho y se recorre con el dedo; los ajustes no.
  const manualZoom = useDocument((s) => typeof s.zoom === 'number')
  const debug = useDocument((s) => s.debug)
  const setFit = useDocument((s) => s.setFit)
  const setVisible = useDocument((s) => s.setVisible)
  const fileName = useDocument((s) => s.fileName)
  const [near, setNear] = useState<ReadonlySet<number>>(() => new Set([1, 2]))
  /** Ancho disponible para el contenido de una lámina, en px CSS. */
  const [available, setAvailable] = useState(Number.POSITIVE_INFINITY)

  // Los ajustes miden la página típica (la mediana): en un PDF con tamaños mezclados, una sola
  // página apaisada no encoge todas las demás; esa página se reduce sola para caber (ver Page).
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const typical = (key: 'width' | 'height') =>
      doc.pages.map((p) => p[key]).sort((a, b) => a - b)[Math.floor(doc.pages.length / 2)]!
    const typicalWidth = typical('width')
    const typicalHeight = typical('height')
    const measure = () => {
      const style = getComputedStyle(el)
      const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      const air = el.clientWidth > 720 ? WIDE_AIR : 0
      const roomX = el.clientWidth - padX - PLATE_CHROME - air
      const roomY = el.clientHeight - padY - PLATE_CHROME - CAPTION
      setAvailable(roomX)
      const width = fitScale(roomX / typicalWidth)
      setFit({ width, page: fitScale(Math.min(roomX / typicalWidth, roomY / typicalHeight)) })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [doc, setFit])

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

  usePinchZoom(scrollRef, sheetsRef)

  return (
    <div
      ref={scrollRef}
      tabIndex={-1}
      data-scroll-root
      // pan-x pan-y: un dedo desplaza (con la inercia del navegador) y el pellizco es del visor.
      className="h-full touch-pan-x touch-pan-y overflow-auto overscroll-contain px-3 py-6 outline-none sm:px-6"
    >
      {/* Sin columna derecha, la pista de edición y el resultado de exportar van arriba de las láminas. */}
      <EditHint className="mx-auto mb-4 lg:hidden" style={{ maxWidth: available + PLATE_CHROME }} />
      <ExportNotice
        touch
        className="mx-auto mb-4 lg:hidden"
        style={{ maxWidth: available + PLATE_CHROME }}
      />
      <div ref={sheetsRef} className="flex w-fit min-w-full flex-col gap-8 pb-[30vh]">
        {doc.pages.map((info) => (
          <Page
            key={info.page}
            info={info}
            scale={scale}
            maxWidth={manualZoom ? Number.POSITIVE_INFINITY : available}
            near={near.has(info.page)}
            fileName={info.page === 1 ? (fileName ?? undefined) : undefined}
            debug={debug}
          />
        ))}
      </div>
    </div>
  )
}
