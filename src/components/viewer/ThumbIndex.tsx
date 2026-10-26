import { scrollToPage } from '@/lib/scroll'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'
import { useDocument } from '@/store/document'

/** Hasta este número de páginas cada uñero es una página; arriba de eso, un rango. */
const MAX_SINGLE_TABS = 16

/** Uñeros: los cortes del canto de un diccionario, para saltar entre páginas. */
export function ThumbIndex({ numPages }: { numPages: number }) {
  const t = useT()
  const current = useDocument((s) => s.current)
  const per = numPages <= MAX_SINGLE_TABS ? 1 : Math.ceil(numPages / MAX_SINGLE_TABS)

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
            'tabular flex h-10 w-full items-center justify-center rounded-l-md font-serif text-[15px] leading-none font-semibold transition-[width,background-color] duration-200 ease-out lg:h-11',
            active
              ? 'bg-vermilion w-full text-white'
              : 'bg-ink-10 text-ink-0 hover:bg-ink-8 w-[78%]',
          )}
        >
          {first}
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
