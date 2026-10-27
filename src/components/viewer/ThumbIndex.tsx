import { scrollToPage } from '@/lib/scroll'
import { cn } from '@/lib/utils'
import { useFormatNumber, useT } from '@/i18n'
import { useDocument } from '@/store/document'

/** Hasta este número de páginas cada uñero es una página; arriba de eso, un rango. */
const MAX_SINGLE_TABS = 16

/** Uñeros: ranuras talladas en el muro de concreto, una por página (o por rango), para saltar. */
export function ThumbIndex({ numPages }: { numPages: number }) {
  const t = useT()
  const current = useDocument((s) => s.current)
  const format = useFormatNumber()
  const per = numPages <= MAX_SINGLE_TABS ? 1 : Math.ceil(numPages / MAX_SINGLE_TABS)
  // Con tres o más cifras el número no cabe en una ranura angosta: baja el cuerpo.
  const digits = String(numPages).length

  const tabs = Array.from({ length: Math.ceil(numPages / per) }, (_, i) => {
    const first = i * per + 1
    const last = Math.min(numPages, first + per - 1)
    const active = current >= first && current <= last
    const single = first === last
    return (
      <li key={first} className="flex w-full justify-center">
        <button
          type="button"
          onClick={() => scrollToPage(first)}
          aria-current={active ? 'page' : undefined}
          aria-label={single ? t('goToPage', { n: first }) : t('goToRange', { a: first, b: last })}
          className={cn(
            // Ranura tallada: sombra interior recta arriba-izquierda; la actual es un bloque carbón.
            'tabular flex h-11 w-full items-center justify-center leading-none font-bold transition-colors duration-150 ease-out lg:h-14',
            digits >= 4 ? 'text-[11px]' : digits === 3 ? 'text-[12.5px]' : 'text-[15px]',
            active
              ? 'bg-ink-10 text-white'
              : 'bg-ink-1 text-ink-8 hover:bg-ink-0 shadow-[inset_3px_3px_0_rgb(0_0_0/0.12)]',
          )}
        >
          {format(active ? current : first)}
        </button>
      </li>
    )
  })

  return (
    <nav aria-label={t('thumbIndex')} className="h-full overflow-y-auto px-1.5 py-4 lg:px-5">
      <p className="guide-caps text-ink-8 mb-3 hidden text-center text-xs lg:block">
        {t('pageShort')}
      </p>
      <ol className="flex flex-col items-center gap-2">{tabs}</ol>
    </nav>
  )
}
