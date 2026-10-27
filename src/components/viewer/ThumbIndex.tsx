import { scrollToPage } from '@/lib/scroll'
import { cn } from '@/lib/utils'
import { useFormatNumber, useT } from '@/i18n'
import { useDocument } from '@/store/document'

/** Hasta este número de páginas cada uñero es una página; arriba de eso, un rango. */
const MAX_SINGLE_TABS = 16

/** Uñeros: bloques de concreto sobre la plaza, uno por página (o por rango), para saltar. */
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
            // Bloque claro con un leve hundido; el actual es carbón y proyecta la misma sombra larga.
            'tabular flex h-11 w-full items-center justify-center leading-none font-bold transition-colors duration-150 ease-out lg:h-14',
            digits >= 4 ? 'text-[11px]' : digits === 3 ? 'text-[12.5px]' : 'text-[15px]',
            active
              ? 'bg-ink-10 text-white shadow-[5px_6px_0_rgb(42_42_40/0.18)]'
              : 'bg-ink-0 text-ink-8 hover:bg-white shadow-[inset_2px_2px_0_rgb(0_0_0/0.08)]',
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
