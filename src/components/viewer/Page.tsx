import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { PageInfo, TextBlock } from '@/core/engine'
import { toScreenRect, viewportTransform } from '@/core/geometry'
import { EditLayer } from '@/components/editor/EditLayer'
import { FileName } from '@/components/shell/FileName'
import { engine } from '@/lib/engine'
import { useT } from '@/i18n'
import { useDocument, type DebugMode } from '@/store/document'
import { useEdits } from '@/store/edits'

/** iOS no dibuja un canvas de más de ~16.7 millones de píxeles; se deja margen. */
const MAX_CANVAS_PIXELS = 12_000_000

interface PageProps {
  info: PageInfo
  /** Escala del documento; una página más ancha que `maxWidth` se reduce sola para caber. */
  scale: number
  maxWidth: number
  /** La página está cerca del área visible: se dibuja. Lejos, se libera el canvas. */
  near: boolean
  debug: DebugMode
  /** Solo en la primera lámina: en celular no hay otro lugar donde se vea el nombre. */
  fileName?: string
}

/** Una página del PDF presentada como lámina enmarcada. */
export const Page = memo(function Page({
  info,
  scale: docScale,
  maxWidth,
  near,
  debug,
  fileName,
}: PageProps) {
  const t = useT()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // pdf.js tarda en cancelar un render; el siguiente espera a que el anterior suelte el canvas,
  // o el viejo alcanza a dibujar a otra escala encima del nuevo.
  const renderChain = useRef<Promise<void>>(Promise.resolve())
  /** Párrafos de la página: las unidades que se editan. null mientras no se han leído. */
  const [blocks, setBlocks] = useState<TextBlock[] | null>(null)
  const hasText = blocks === null ? null : blocks.length > 0
  const setPageHasText = useDocument((s) => s.setPageHasText)
  const registerBlocks = useEdits((s) => s.registerBlocks)
  // La edición en páginas o textos rotados llega después; esos bloques no se ofrecen.
  const editable = useMemo(
    () => (info.rotate === 0 ? (blocks ?? []).filter((b) => b.rotation === 0) : []),
    [blocks, info.rotate],
  )
  const scale = Math.min(docScale, maxWidth / info.width)
  const width = Math.round(info.width * scale)
  const height = Math.round(info.height * scale)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const controller = new AbortController()
    // Con mucho zoom, la densidad baja para no pasar del límite de píxeles por canvas de iOS.
    const area = info.width * info.height * scale * scale
    const dpr = Math.min(window.devicePixelRatio || 1, 3, Math.sqrt(MAX_CANVAS_PIXELS / area))
    renderChain.current = renderChain.current.then(async () => {
      if (controller.signal.aborted) return
      if (!near) {
        // Liberar memoria: iOS limita el total de píxeles de canvas por pestaña.
        canvas.width = 0
        canvas.height = 0
        return
      }
      try {
        await engine.renderPage(info.page, {
          canvas,
          scale: scale * dpr,
          signal: controller.signal,
        })
      } catch (error) {
        if (!(error instanceof Error && error.name === 'RenderingCancelledException')) throw error
      }
    })
    return () => controller.abort()
  }, [info.page, info.width, info.height, scale, near])

  useEffect(() => {
    if (!near || blocks !== null) return
    let alive = true
    void engine.getTextBlocks(info.page, 'paragraph').then((found) => {
      if (!alive) return
      setBlocks(found)
      setPageHasText(info.page, found.length > 0)
      registerBlocks(found)
    })
    return () => {
      alive = false
    }
  }, [info.page, near, blocks, setPageHasText, registerBlocks])

  return (
    <figure
      id={`page-${info.page}`}
      data-page={info.page}
      className="mx-auto w-fit scroll-mt-6"
      aria-label={t('page', { n: info.page })}
    >
      {/* En escritorio el aviso vive en la columna de cambios; sin ella, arriba de la lámina. */}
      {hasText === false && (
        <p
          role="note"
          className="text-vermilion mb-2 text-sm lg:hidden"
          style={{ maxWidth: width }}
        >
          {t('noTextPage')}
        </p>
      )}
      <div className="border-rule bg-ink-0 border-[1.5px] p-2">
        <div data-sheet className="relative bg-white" style={{ width, height }}>
          <canvas ref={canvasRef} className="block size-full" aria-hidden />
          {near && editable.length > 0 && (
            <EditLayer info={info} scale={scale} blocks={editable} canvasRef={canvasRef} />
          )}
          {near && debug !== 'off' && (
            <DebugOverlay
              info={info}
              scale={scale}
              kind={debug === 'line' ? 'line' : 'paragraph'}
            />
          )}
        </div>
      </div>
      <figcaption
        className="text-muted-foreground mt-2 flex items-baseline gap-2 text-xs"
        style={{ maxWidth: width + 2 * (1.5 + 8) }}
      >
        <span className="guide-caps tabular text-ink-8 shrink-0">
          {t('page', { n: info.page })}
        </span>
        {fileName && <FileName name={fileName} className="md:hidden" />}
        {info.rotate !== 0 && hasText && <span className="ml-auto">{t('rotatedNoEdit')}</span>}
      </figcaption>
    </figure>
  )
})

function DebugOverlay({
  info,
  scale,
  kind,
}: {
  info: PageInfo
  scale: number
  kind: TextBlock['kind']
}) {
  const [blocks, setBlocks] = useState<TextBlock[]>([])
  const matrix = useMemo(() => viewportTransform(info.view, info.rotate, scale), [info, scale])

  useEffect(() => {
    let alive = true
    void engine.getTextBlocks(info.page, kind).then((b) => alive && setBlocks(b))
    return () => {
      alive = false
    }
  }, [info.page, kind])

  // Ultramar sin relleno: la lámina nunca se tiñe, y el bermellón queda para la edición activa.
  const outline = `1.5px ${kind === 'line' ? 'solid' : 'dashed'} var(--ultramar)`
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {blocks.map((block) => {
        const r = toScreenRect(matrix, block)
        return (
          <div
            key={block.id}
            title={block.text}
            className="absolute"
            style={{
              left: r.left,
              top: r.top,
              width: r.width,
              height: r.height,
              outline,
            }}
          />
        )
      })}
    </div>
  )
}
