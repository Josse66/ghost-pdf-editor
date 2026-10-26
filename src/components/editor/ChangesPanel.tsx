import { useId } from 'react'
import { cn } from '@/lib/utils'
import { useT, type Translate } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import { useDocument, type DebugMode } from '@/store/document'

/** Columna derecha: los cambios asentados como entradas de diccionario (llegan en la Fase 3). */
export function ChangesPanel() {
  const t = useT()
  const pageCount = useDocument((s) => s.doc?.numPages ?? 0)

  return (
    <div className="flex h-full flex-col">
      <section className="flex-1 overflow-y-auto px-6 py-5">
        <h2 className="border-rule flex items-baseline justify-between border-b pb-2 text-xs font-semibold tracking-[0.1em] uppercase">
          {t('changes')}
          <span className="tabular text-muted-foreground font-normal">0</span>
        </h2>
        <p className="text-muted-foreground mt-4 font-serif text-[15px] leading-relaxed">
          {t('changesEmpty')}
        </p>
        <p className="tabular text-muted-foreground mt-6 text-xs">
          {pageCount === 1 ? t('pageCountOne') : t('pageCount', { n: pageCount })}
        </p>
      </section>
      <DebugSwitch t={t} />
    </div>
  )
}

const MODES: { value: DebugMode; label: MessageKey }[] = [
  { value: 'off', label: 'debugOff' },
  { value: 'line', label: 'debugLines' },
  { value: 'paragraph', label: 'debugParagraphs' },
]

function DebugSwitch({ t }: { t: Translate }) {
  const debug = useDocument((s) => s.debug)
  const setDebug = useDocument((s) => s.setDebug)
  const name = useId()

  return (
    <fieldset className="border-rule border-t px-6 py-4">
      <legend className="sr-only">{t('debugTitle')}</legend>
      <p className="mb-2 text-xs font-semibold tracking-[0.1em] uppercase" aria-hidden>
        {t('debugTitle')}
      </p>
      <div className="border-input grid grid-cols-3 rounded-md border p-0.5">
        {MODES.map((mode) => (
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
