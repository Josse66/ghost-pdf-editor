import { Redo2, Undo2 } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { DEBUG_MODES } from '@/components/viewer/debug-modes'
import type { BlockEdit } from '@/core/edits/history'
import { substituteFor } from '@/core/fonts/substitutes'
import { useFinePointer } from '@/hooks/usePointer'
import { scrollToBlock } from '@/lib/scroll'
import { cn } from '@/lib/utils'
import { useFormatNumber, useT, type Translate } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import { useDocument } from '@/store/document'
import { useEdits } from '@/store/edits'
import { useCurrentExport, warningsFor, type ExportWarning } from '@/store/export'
import { ExportNotice } from './ExportNotice'

/** Columna derecha (escritorio): los cambios asentados como entradas de diccionario. */
export function ChangesPanel() {
  const t = useT()
  const pageCount = useDocument((s) => s.doc?.numPages ?? 0)
  const current = useDocument((s) => s.current)
  const currentTextless = useDocument((s) => s.textless.has(s.current))

  return (
    <div className="flex h-full flex-col">
      <section className="flex-1 overflow-y-auto px-6 py-5">
        {currentTextless && (
          <div role="note" className="border-vermilion mb-6 border-b pb-4">
            <p className="text-vermilion text-[17px] font-semibold">
              {t('noTextTitle', { n: current })}
            </p>
            <p className="text-ink-8 mt-1 text-[15px] leading-relaxed">{t('noTextPage')}</p>
          </div>
        )}
        <ExportNotice className="mb-6" />
        <ChangesList />
        <p className="tabular text-muted-foreground mt-6 text-xs">
          {pageCount === 1 ? t('pageCountOne') : t('pageCount', { n: pageCount })}
        </p>
      </section>
      <DebugSwitch t={t} />
    </div>
  )
}

/**
 * Encabezado «Cambios · n» con deshacer/rehacer y las entradas. Lo comparten la columna de
 * escritorio y la hoja del celular; `onNavigate` avisa antes de ir al bloque (la hoja se cierra).
 */
export function ChangesList({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT()
  const format = useFormatNumber()
  const finePointer = useFinePointer()
  const present = useEdits((s) => s.history.present)
  const canUndo = useEdits((s) => s.history.past.length > 0)
  const canRedo = useEdits((s) => s.history.future.length > 0)
  const undo = useEdits((s) => s.undo)
  const redo = useEdits((s) => s.redo)
  const entries = [...present.values()].sort(documentOrder)

  return (
    <>
      <div className="border-rule flex items-center justify-between gap-2 border-b pb-1.5">
        <h2 className="guide-caps text-[15px] font-semibold">
          {t('changes')}{' '}
          <span className="tabular text-muted-foreground font-normal">
            · {format(entries.length)}
          </span>
        </h2>
        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!canUndo}
            onClick={undo}
            aria-label={t('undo')}
            title={`${t('undo')} (Ctrl+Z)`}
          >
            <Undo2 />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!canRedo}
            onClick={redo}
            aria-label={t('redo')}
            title={`${t('redo')} (Ctrl+Y)`}
          >
            <Redo2 />
          </Button>
        </div>
      </div>
      {entries.length === 0 ? (
        <>
          <p className="text-muted-foreground mt-4 font-serif text-[15px] leading-relaxed">
            {t('changesEmpty')}
          </p>
          <p className="text-ink-8 mt-3 text-sm leading-snug">
            {finePointer ? t('changesHintMouse') : t('changesHintTouch')}
          </p>
        </>
      ) : (
        <ol className="mt-1">
          {entries.map((edit) => (
            <ChangeEntry key={edit.blockId} edit={edit} t={t} onNavigate={onNavigate} />
          ))}
        </ol>
      )}
    </>
  )
}

/** Una corrección asentada: lo viejo tachado, lo nuevo, y su «letra chiquita». */
function ChangeEntry({
  edit,
  t,
  onNavigate,
}: {
  edit: BlockEdit
  t: Translate
  onNavigate?: () => void
}) {
  const block = useEdits((s) => s.blocks.get(edit.blockId))
  const revert = useEdits((s) => s.revert)
  const exported = useCurrentExport()
  const warnings = exported?.report ? warningsFor(exported.report, edit.blockId) : []
  const style = block?.runs[0]
  const substitute = style ? substituteFor(style.fontFamily, style.generic) : null

  return (
    <li className="entry-enter border-ink-3 border-b py-3.5 last:border-b-0">
      <button
        type="button"
        onClick={() => {
          onNavigate?.()
          scrollToBlock(edit.page, edit.blockId)
        }}
        className="block w-full rounded-sm text-left font-serif"
      >
        <span className="text-ink-7 decoration-vermilion line-clamp-2 text-[15px] line-through decoration-2">
          {edit.before}
        </span>
        <span className="mt-0.5 line-clamp-3 text-[17px] leading-snug font-semibold">
          {edit.after || '—'}
        </span>
      </button>
      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        <p className="text-ink-7 font-serif text-sm italic">
          {style && substitute
            ? t('entryApparatus', {
                page: edit.page,
                from: style.fontFamily,
                to: substitute.family,
              })
            : t('page', { n: edit.page })}
          {substitute && !substitute.metricCompatible && (
            <span className="text-vermilion"> · {t('notTwin')}</span>
          )}
          {warnings.map((w) => (
            <span key={w} className="text-vermilion">
              {' '}
              · {t(WARNING_TEXT[w])}
            </span>
          ))}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => revert(edit.blockId)}
          className="text-ink-8 shrink-0"
        >
          {t('restore')}
        </Button>
      </div>
    </li>
  )
}

/** Letra chiquita de cada aviso de exportación. */
const WARNING_TEXT = {
  notErased: 'warnNotErased',
  squeezed: 'warnSqueezed',
  shrunk: 'warnShrunk',
  overflow: 'warnOverflow',
} as const satisfies Record<ExportWarning, MessageKey>

/** Orden de lectura del documento: página y luego el orden de los bloques en ella. */
function documentOrder(a: BlockEdit, b: BlockEdit): number {
  const index = (id: string) => Number(id.split('-b')[1] ?? 0)
  return a.page - b.page || index(a.blockId) - index(b.blockId)
}

function DebugSwitch({ t }: { t: Translate }) {
  const debug = useDocument((s) => s.debug)
  const setDebug = useDocument((s) => s.setDebug)
  const name = useId()

  return (
    <fieldset className="border-rule border-t px-6 py-4">
      <legend className="sr-only">{t('debugTitle')}</legend>
      <p className="text-ink-9 mb-2 text-sm font-medium" aria-hidden>
        {t('debugTitle')}
      </p>
      <div className="border-input grid grid-cols-3 rounded-md border p-0.5">
        {DEBUG_MODES.map((mode) => (
          <label
            key={mode.value}
            className={cn(
              'has-focus-visible:outline-ultramar cursor-pointer rounded-[3px] px-2 py-1.5 text-center text-sm has-focus-visible:outline-2',
              debug === mode.value ? 'bg-ink-10 text-ink-0' : 'text-ink-8 hover:bg-muted',
            )}
          >
            <input
              type="radio"
              name={name}
              value={mode.value}
              checked={debug === mode.value}
              onChange={() => setDebug(mode.value)}
              className="sr-only"
            />
            {t(mode.label)}
          </label>
        ))}
      </div>
      <p className="text-muted-foreground mt-2 text-xs leading-snug">{t('debugLegend')}</p>
    </fieldset>
  )
}
