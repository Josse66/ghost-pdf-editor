import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import { sampleBackground, sampleInk, toCss, type Pixels } from '@/core/color/sample'
import type { BlockEdit, EditedRun } from '@/core/edits/history'
import { flowText, runsFromBlock } from '@/core/edits/runs'
import type { PageInfo, Rgb, TextBlock } from '@/core/engine'
import { applyMatrix, toScreenRect, viewportTransform, type Matrix } from '@/core/geometry'
import { measureBaseline, measureLines, placeCaretAt, readRuns } from '@/lib/editor-dom'
import { useFinePointer } from '@/hooks/usePointer'
import { loadRunFonts, runCss } from '@/lib/fonts'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'
import { useEdits } from '@/store/edits'

interface Colors {
  background: Rgb
  /** Tinta por run del bloque original (mismo índice que `block.runs`). */
  inks: Rgb[]
}

type Rect = ReturnType<typeof toScreenRect>

const DEFAULT_COLORS: Colors = { background: [1, 1, 1], inks: [] }

/**
 * Capa sobre una lámina: una zona sensible por bloque y, si el bloque está editado o en edición,
 * un parche del color del fondo con el texto nuevo pintado encima en su fuente gemela.
 */
export const EditLayer = memo(function EditLayer({
  info,
  scale,
  blocks,
  canvasRef,
}: {
  info: PageInfo
  scale: number
  blocks: readonly TextBlock[]
  canvasRef: RefObject<HTMLCanvasElement | null>
}) {
  const matrix = useMemo(() => viewportTransform(info.view, info.rotate, scale), [info, scale])
  const present = useEdits((s) => s.history.present)
  const selected = useEdits((s) => s.selected)
  const editing = useEdits((s) => s.editing)
  const select = useEdits((s) => s.select)
  // Los colores salen del render y no cambian con el zoom: se leen una vez por bloque, desde un
  // efecto del bloque (nunca durante el render) y cuando el canvas ya está dibujado.
  const colorCache = useRef(new Map<string, Colors>())
  const readColorsFor = useCallback(
    (block: TextBlock): Colors | null => {
      const cached = colorCache.current.get(block.id)
      if (cached) return cached
      const canvas = canvasRef.current
      if (!canvas || canvas.width === 0) return null
      const colors = readColors(canvas, block, info.width * scale, matrix)
      colorCache.current.set(block.id, colors)
      return colors
    },
    [canvasRef, info.width, scale, matrix],
  )

  return (
    <div
      className="absolute inset-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) select(null)
      }}
    >
      {blocks.map((block) => {
        const edit = present.get(block.id)
        const isEditing = editing?.id === block.id
        return (
          <BlockSlot
            key={block.id}
            block={block}
            rect={toScreenRect(matrix, block)}
            matrix={matrix}
            scale={scale}
            edit={edit}
            selected={selected === block.id}
            editing={isEditing ? editing : null}
            readColors={readColorsFor}
          />
        )
      })}
    </div>
  )
})

function BlockSlot({
  block,
  rect,
  matrix,
  scale,
  edit,
  selected,
  editing,
  readColors,
}: {
  block: TextBlock
  rect: Rect
  matrix: Matrix
  scale: number
  edit: BlockEdit | undefined
  selected: boolean
  editing: { id: string; caret?: { x: number; y: number } } | null
  readColors: (block: TextBlock) => Colors | null
}) {
  const t = useT()
  const pointerType = useRef('mouse')
  const select = useEdits((s) => s.select)
  const startEditing = useEdits((s) => s.startEditing)
  const runs = edit?.runs ?? runsFromBlock(block)
  const [sampled, setSampled] = useState<Colors | null>(null)
  const colors = sampled ?? DEFAULT_COLORS
  const needsColors = !!(edit || editing)
  // Un texto editado puede ocupar más que el original: la zona sensible crece con él.
  const [extent, setExtent] = useState<{ width: number; height: number } | null>(null)
  // Una línea crece a lo ancho; un párrafo, a lo alto (si el texto nuevo agregó líneas).
  const multiline = (block.lines?.length ?? 1) > 1
  const hitWidth = edit && !multiline ? Math.max(rect.width, extent?.width ?? 0) : rect.width
  const hitHeight = edit && multiline ? Math.max(rect.height, extent?.height ?? 0) : rect.height

  // Lee los colores en cuanto el canvas de la página está dibujado (reintenta unos cuadros).
  useEffect(() => {
    if (!needsColors || sampled) return
    let frame = 0
    let tries = 0
    const attempt = () => {
      const found = readColors(block)
      if (found) setSampled(found)
      else if (++tries < 90) frame = requestAnimationFrame(attempt)
    }
    attempt()
    return () => cancelAnimationFrame(frame)
  }, [needsColors, sampled, readColors, block])

  return (
    <>
      {(edit || editing) && (
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: rect.left - 1,
            top: rect.top - 1,
            width: rect.width + 2,
            height: rect.height + 2,
            background: toCss(colors.background),
          }}
        />
      )}
      {/* Claves distintas: editar y mostrar son instancias separadas, así deshacer pinta lo correcto. */}
      {editing ? (
        <BlockText
          key="editing"
          block={block}
          runs={runs}
          rect={rect}
          matrix={matrix}
          scale={scale}
          colors={colors}
          editing={editing}
        />
      ) : (
        edit && (
          <BlockText
            key="view"
            block={block}
            runs={runs}
            rect={rect}
            matrix={matrix}
            scale={scale}
            colors={colors}
            onMeasure={setExtent}
          />
        )
      )}
      {edit && !editing && (
        // Marca de corrección al margen, como en una prueba de imprenta.
        <span
          aria-hidden
          className="bg-ultramar pointer-events-none absolute"
          style={{ left: rect.left - 7, top: rect.top, width: 2, height: rect.height }}
        />
      )}
      <div
        role="button"
        tabIndex={0}
        data-hit={block.id}
        aria-label={t('editBlock', { text: block.text.slice(0, 80) })}
        aria-pressed={selected}
        hidden={!!editing}
        className={cn(
          // Contorno pegado a la caja: con líneas juntas, uno separado taparía la línea de al lado.
          'hover:outline-ultramar/60 absolute cursor-text rounded-[2px] outline-offset-0 select-none hover:outline hover:outline-1 focus-visible:outline-offset-0',
          selected &&
            'outline-ultramar hover:outline-ultramar outline-[1.5px] outline-solid hover:outline-[1.5px]',
        )}
        style={{ left: rect.left, top: rect.top, width: hitWidth, height: hitHeight }}
        onPointerDown={(e) => {
          pointerType.current = e.pointerType
        }}
        onClick={(e) => {
          // En táctil no hay doble clic cómodo: el primer toque selecciona y el segundo edita.
          if (pointerType.current !== 'mouse' && selected) {
            startEditing(block.id, { x: e.clientX, y: e.clientY })
          } else {
            select(block.id)
          }
        }}
        onDoubleClick={(e) => startEditing(block.id, { x: e.clientX, y: e.clientY })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            startEditing(block.id)
          } else if (e.key === 'Escape') {
            select(null)
          }
        }}
      />
    </>
  )
}

/** El texto del bloque pintado con su gemela; editable mientras `editing` está presente. */
function BlockText({
  block,
  runs,
  rect,
  matrix,
  scale,
  colors,
  editing,
  onMeasure,
}: {
  block: TextBlock
  runs: readonly EditedRun[]
  rect: Rect
  matrix: Matrix
  scale: number
  colors: Colors
  editing?: { id: string; caret?: { x: number; y: number } }
  /** Solo mostrando: informa cuánto ocupa el texto nuevo (la zona sensible lo cubre). */
  onMeasure?: (size: { width: number; height: number }) => void
}) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const commit = useEdits((s) => s.commit)
  const stopEditing = useEdits((s) => s.stopEditing)
  const lines = block.lines ?? [block]
  const multiline = lines.length > 1
  const first = lines[0]!
  const [left, baselineY] = applyMatrix(matrix, first.x, first.baseline)
  const lineHeight = multiline ? (lines[0]!.baseline - lines[1]!.baseline) * scale : undefined
  // Editando, el contenido inicial se pinta una vez y luego el DOM manda (contenteditable);
  // mostrando, se pintan los runs vigentes.
  const [frozenRuns] = useState(runs)
  const shownRuns = editing ? frozenRuns : runs
  const closed = useRef(false)
  const rectWidth = rect.width
  // iOS hace zoom al enfocar texto de menos de 16px (y no lo deshace). En táctil, el editor se
  // pinta a ≥16px y se encoge con transform: se ve igual y el navegador no hace zoom. Nunca se
  // desactiva el zoom del usuario.
  const finePointer = useFinePointer()
  const smallest = Math.min(...block.runs.map((r) => r.fontSize)) * scale
  const k = editing && !finePointer && smallest < 16 ? 16 / smallest : 1

  // Alinea la línea base del texto nuevo con la del original, sea cual sea la gemela. Se mide de
  // inmediato y otra vez cuando la gemela termina de cargar (antes, las métricas son de respaldo).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let alive = true
    const measure = () => {
      if (!alive) return
      el.style.top = `${baselineY - measureBaseline(el)}px`
      markOverflow(el, rectWidth * k, lines.length, lineHeight && lineHeight * k)
      onMeasure?.({ width: el.offsetWidth, height: el.offsetHeight })
    }
    measure()
    void loadRunFonts(shownRuns.map((r) => block.runs[r.style] ?? block.runs[0]!)).then(measure)
    return () => {
      alive = false
    }
  }, [baselineY, rectWidth, lines.length, lineHeight, shownRuns, onMeasure, block.runs, k])

  // Al entrar a editar: foco y cursor donde fue el doble clic (o al final). Solo una vez.
  const caret = editing?.caret
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !editing) return
    el.focus({ preventScroll: true })
    if (!caret || !placeCaretAt(caret.x, caret.y)) {
      window.getSelection()?.selectAllChildren(el)
      window.getSelection()?.collapseToEnd()
    }
    if (finePointer) return
    // En táctil sale el teclado y puede tapar el editor: cuando termina de abrir, se centra.
    const reveal = () => el.scrollIntoView({ block: 'center' })
    const viewport = window.visualViewport
    viewport?.addEventListener('resize', reveal, { once: true })
    const fallback = window.setTimeout(reveal, 400)
    return () => {
      viewport?.removeEventListener('resize', reveal)
      window.clearTimeout(fallback)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar el editor
  }, [])

  const finish = (save: boolean) => {
    const el = ref.current
    // Escape y Enter cierran el editor; el blur que llega después no debe volver a confirmar.
    if (!el || !editing || closed.current) return
    closed.current = true
    if (!save) {
      stopEditing()
      refocusHit(block.id)
      return
    }
    const newRuns = readRuns(el)
    commit({
      blockId: block.id,
      page: block.page,
      before: flowText(block),
      after: newRuns.map((r) => r.text).join(''),
      runs: newRuns,
      lines: measureLines(el),
    })
    refocusHit(block.id)
  }

  const style: CSSProperties = {
    left,
    top: baselineY,
    whiteSpace: multiline ? 'pre-wrap' : 'pre',
    width: multiline ? (rect.width + 2) * k : undefined,
    minWidth: multiline ? undefined : rect.width * k,
    lineHeight: lineHeight ? `${lineHeight * k}px` : 'normal',
    ...(k !== 1 && {
      transform: `scale(${1 / k})`,
      transformOrigin: '0 0',
      outlineWidth: `${1.5 * k}px`,
    }),
  }

  return (
    <div
      ref={ref}
      role={editing ? 'textbox' : undefined}
      aria-label={editing ? t('editingBlock') : undefined}
      aria-multiline={editing ? multiline : undefined}
      contentEditable={editing ? 'true' : undefined}
      suppressContentEditableWarning
      spellCheck={editing ? true : undefined}
      className={cn(
        'absolute [overflow-wrap:anywhere] outline-offset-2',
        editing ? 'outline-ultramar z-10 outline-[1.5px] outline-solid' : 'pointer-events-none',
      )}
      style={style}
      title={editing ? undefined : t('edited')}
      onInput={(e) =>
        markOverflow(e.currentTarget, rectWidth * k, lines.length, lineHeight && lineHeight * k)
      }
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          finish(false)
        } else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          finish(true)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          document.execCommand('insertLineBreak')
        }
      }}
      onBlur={() => finish(true)}
      onPaste={(e) => {
        // Solo texto plano: el formato lo pone el PDF, no el portapapeles.
        e.preventDefault()
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
      }}
    >
      {shownRuns.map((run, i) => {
        const original = block.runs[run.style] ?? block.runs[0]!
        return (
          <span
            key={i}
            data-style={run.style}
            style={{
              ...runCss(original, scale * k),
              color: toCss(colors.inks[run.style] ?? [0, 0, 0]),
            }}
          >
            {run.text}
          </span>
        )
      })}
    </div>
  )
}

/**
 * Avisa (subrayado bermellón) si el texto nuevo ya no cabe donde estaba el original: una línea que
 * se pasa del ancho, o un párrafo que necesita más líneas que antes.
 */
function markOverflow(el: HTMLElement, width: number, maxLines: number, lineHeight?: number) {
  const over = lineHeight
    ? Math.round(el.offsetHeight / lineHeight) > maxLines
    : el.offsetWidth > width + 1
  el.dataset.overflow = String(over)
  el.style.boxShadow = over ? 'inset 0 -2px 0 var(--vermilion)' : ''
}

function refocusHit(id: string) {
  requestAnimationFrame(() =>
    document
      .querySelector<HTMLElement>(`[data-hit="${CSS.escape(id)}"]`)
      ?.focus({ preventScroll: true }),
  )
}

/** Lee del canvas el fondo alrededor del bloque y la tinta de cada run. */
function readColors(
  canvas: HTMLCanvasElement,
  block: TextBlock,
  cssWidth: number,
  matrix: Matrix,
): Colors {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return DEFAULT_COLORS
  const ratio = canvas.width / cssWidth
  const pad = Math.max(2, Math.round(3 * ratio))
  const grab = (r: Rect, extra: number): Pixels => {
    const x = Math.max(0, Math.floor(r.left * ratio) - extra)
    const y = Math.max(0, Math.floor(r.top * ratio) - extra)
    const w = Math.max(1, Math.min(canvas.width - x, Math.ceil(r.width * ratio) + extra * 2))
    const h = Math.max(1, Math.min(canvas.height - y, Math.ceil(r.height * ratio) + extra * 2))
    return ctx.getImageData(x, y, w, h)
  }
  const background = sampleBackground(grab(toScreenRect(matrix, block), pad), pad).rgb
  const inks = block.runs.map((run) => sampleInk(grab(toScreenRect(matrix, run), 0), background))
  return { background, inks }
}
