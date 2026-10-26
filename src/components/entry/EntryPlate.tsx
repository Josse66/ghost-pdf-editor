import { FileUp, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFilePicker } from '@/hooks/useFileOpen'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import { useDocument, type OpenError } from '@/store/document'

const ERROR_TEXT: Record<OpenError, MessageKey> = {
  password: 'errorPassword',
  invalid: 'errorInvalid',
  'not-pdf': 'errorNotPdf',
  unknown: 'errorUnknown',
}

/** Sin documento, la lámina misma es el lugar para soltar el PDF. */
export function EntryPlate({ dragging }: { dragging: boolean }) {
  const t = useT()
  const pick = useFilePicker()
  const { status, fileName, error, progress } = useDocument()

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-8">
      <div
        className={cn(
          // La lámina conserva la proporción de una hoja pero nunca rebasa la altura disponible.
          'w-full max-w-[min(34rem,calc((100svh-8.5rem)/1.18))] border-[1.5px] p-2 transition-colors duration-150',
          dragging ? 'border-ultramar bg-ultramar/5' : 'border-rule',
        )}
      >
        <div
          className={cn(
            'flex aspect-[1/1.18] min-h-[22rem] flex-col justify-center gap-6 bg-white px-8 sm:px-12',
            dragging && 'outline-ultramar outline-2 -outline-offset-8 outline-dashed',
          )}
        >
          {status === 'loading' ? (
            <Loading name={fileName ?? ''} read={progress.read} total={progress.total} />
          ) : (
            <>
              {status === 'error' && error && (
                <div role="alert" className="font-serif">
                  <p className="text-ink-7 decoration-vermilion text-lg break-all line-through decoration-2">
                    {fileName}
                  </p>
                  <p className="mt-1 text-[15px] leading-snug">{t(ERROR_TEXT[error])}</p>
                </div>
              )}
              <h1 className="font-serif text-[2rem] leading-tight font-semibold text-balance sm:text-[2.4rem]">
                {dragging ? t('dropActive') : t('dropTitle')}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Button onClick={pick} className="h-11 px-5 text-[15px]">
                  <FileUp />
                  {status === 'error' ? t('chooseAnother') : t('choosePdf')}
                </Button>
                <span className="text-muted-foreground text-[15px]">{t('dropHint')}</span>
              </div>
              <p className="text-ink-8 flex items-center gap-2 text-sm">
                <LockKeyhole className="text-ultramar size-4" aria-hidden />
                {t('privacy')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Loading({ name, read, total }: { name: string; read: number; total: number }) {
  const t = useT()
  const fraction = total ? read / total : 0
  return (
    <div aria-live="polite" className="flex flex-col gap-4">
      <h1 className="font-serif text-2xl leading-tight font-semibold break-all">
        {t('loading', { name })}
      </h1>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total || 1}
        aria-valuenow={read}
        className="bg-ink-2 h-[3px] w-full overflow-hidden"
      >
        <div
          className="bg-ink-10 h-full origin-left transition-transform duration-200 ease-out"
          style={{ transform: `scaleX(${fraction})` }}
        />
      </div>
      <p className="tabular text-muted-foreground text-sm">
        {total ? t('loadingPages', { n: read, total }) : ' '}
      </p>
    </div>
  )
}

/** En la entrada, la columna de cambios explica la app como entradas de diccionario. */
export function Definitions() {
  const t = useT()
  const entries: [MessageKey, MessageKey, MessageKey][] = [
    ['defEditTerm', 'defEditPos', 'defEditBody'],
    ['defExportTerm', 'defExportPos', 'defExportBody'],
    ['defPrivateTerm', 'defPrivatePos', 'defPrivateBody'],
  ]
  return (
    <dl className="px-6 py-5 font-serif">
      {entries.map(([term, pos, body]) => (
        <div key={term} className="border-ink-3 border-b py-4 first:pt-0 last:border-b-0">
          <dt className="text-[19px] font-semibold">
            {t(term)}{' '}
            <span className="text-muted-foreground text-[15px] font-normal italic">{t(pos)}</span>
          </dt>
          <dd className="text-ink-8 mt-1 text-[15px] leading-relaxed">{t(body)}</dd>
        </div>
      ))}
    </dl>
  )
}
