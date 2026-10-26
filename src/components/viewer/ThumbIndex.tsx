import { scrollToPage } from '@/lib/scroll'
import { cn } from '@/lib/utils'
import { useFormatNumber, useT } from '@/i18n'
import { useDocument } from '@/store/document'

/** Hasta este número de páginas cada uñero es una página; arriba de eso, un rango. */
const MAX_SINGLE_TABS = 16

/** Uñeros: los cortes del canto de un diccionario, para saltar entre páginas. */
export function ThumbIndex({ numPages }: { numPages: number }) {
  const t = useT()
  const current = useDocument((s) => s.current)
  const format = useFormatNumber()
  const per = numPages <= MAX_SINGLE_TABS ? 1 : Math.ceil(numPages / MAX_SINGLE_TABS)
  // Con tres o más cifras el número no cabe en una pestaña angosta: baja el cuerpo y los
  // uñeros inactivos se ensanchan un poco.
  const digits = String(numPages).length

  const tabs = Array.from({ length: Math.ceil(numPages / per) }, (_, i) => {
    const first = i * per + 1
    const last = Math.min(numPages, first + per - 1)
    const active = current >= first && current <= last
    const single = first === last
    return (
      <li key={first} className="flex w-full justify-end">
        <button
          type="button"
          onClick={() => scrollToPage(first)}
          aria-current={active ? 'page' : undefined}
          aria-label={single ? t('goToPage', { n: first }) : t('goToRange', { a: first, b: last })}
          className={cn(
            // Media luna a la izquierda: el corte del canto de un diccionario.
            'tabular flex h-10 w-full items-center justify-center rounded-l-full font-serif leading-none font-semibold transition-[width,background-color] duration-200 ease-out lg:h-11',
            digits >= 4 ? 'text-[11px]' : digits === 3 ? 'text-[12.5px]' : 'text-[15px]',
            active
              ? 'bg-vermilion w-full text-white'
              : cn('bg-ink-10 text-ink-0 hover:bg-ink-8', digits >= 3 ? 'w-[90%]' : 'w-[78%]'),
          )}
        >
          {format(active ? current : first)}
        </button>
      </li>
    )
  })

  return (
    <nav aria-label={t('thumbIndex')} className="h-full overflow-y-auto py-4 pl-1.5 lg:pl-4">
      <p className="guide-caps text-muted-foreground mb-3 hidden pr-3 text-right text-xs lg:block">
        {t('pageShort')}
      </p>
      <ol className="flex flex-col items-end gap-1.5">{tabs}</ol>
    </nav>
  )
}
