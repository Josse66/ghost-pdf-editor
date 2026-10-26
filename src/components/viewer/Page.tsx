import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { PageInfo, TextBlock } from '@/core/engine'
import { toScreenRect, viewportTransform } from '@/core/geometry'
import { engine } from '@/lib/engine'
import { useT } from '@/i18n'
import type { DebugMode } from '@/store/document'

interface PageProps {
  info: PageInfo
  scale: number
  /** La página está cerca del área visible: se dibuja. Lejos, se libera el canvas. */
  near: boolean
  debug: DebugMode
}

/** Una página del PDF presentada como lámina enmarcada. */
export const Page = memo(function Page({ info, scale, near, debug }: PageProps) {
  const t = useT()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // pdf.js tarda en cancelar un render; el siguiente espera a que el anterior suelte el canvas,
  // o el viejo alcanza a dibujar a otra escala encima del nuevo.
  const renderChain = useRef<Promise<void>>(Promise.resolve())
  const [hasText, setHasText] = useState<boolean | null>(null)
  const width = Math.round(info.width * scale)
  const height = Math.round(info.height * scale)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const controller = new AbortController()
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
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
  }, [info.page, scale, near])

  useEffect(() => {
    if (!near || hasText !== null) return
    let alive = true
    void engine.getTextBlocks(info.page, 'line').then((lines) => {
      if (alive) setHasText(lines.length > 0)
    })
    return () => {
      alive = false
    }
  }, [info.page, near, hasText])

  return (
    <figure
      id={`page-${info.page}`}
      data-page={info.page}
      className="mx-auto w-fit scroll-mt-6"
      aria-label={t('page', { n: info.page })}
    >
      <div className="border-rule bg-ink-0 border-[1.5px] p-2">
        <div className="relative bg-white" style={{ width, height }}>
          <canvas ref={canvasRef} className="block size-full" aria-hidden />
          {near && debug !== 'off' && (
            <DebugOverlay
              info={info}
              scale={scale}
              kind={debug === 'line' ? 'line' : 'paragraph'}
            />
          )}
        </div>
      </div>
      <figcaption className="text-muted-foreground mt-2 flex items-baseline justify-between gap-4 text-xs">
        <span className="guide-caps tabular text-ink-8">{t('page', { n: info.page })}</span>
        {hasText === false && (
          <span className="text-vermilion max-w-[48ch] text-right">{t('noTextPage')}</span>
        )}
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

  const color = kind === 'line' ? 'var(--ultramar)' : 'var(--vermilion)'
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
              outline: `1.5px solid ${color}`,
              background: `color-mix(in srgb, ${color} 8%, transparent)`,
            }}
          />
        )
      })}
    </div>
  )
}
