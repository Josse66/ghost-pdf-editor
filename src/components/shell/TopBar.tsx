import { FolderOpen, Download, Minus, Plus, MoveHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFilePicker } from '@/hooks/useFileOpen'
import { useT } from '@/i18n'
import { nextStep, toPercent } from '@/lib/zoom'
import { selectScale, useDocument } from '@/store/document'

export function TopBar() {
  const t = useT()
  const pick = useFilePicker()
  const status = useDocument((s) => s.status)
  const fileName = useDocument((s) => s.fileName)
  const ready = status === 'ready'

  return (
    <header className="border-rule grid h-14 grid-cols-[1fr_auto] items-center gap-3 border-b px-3 sm:px-5 lg:grid-cols-[1fr_auto_1fr]">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="text-[15px] font-semibold tracking-tight whitespace-nowrap">
          {t('appName')}
        </span>
        {ready && fileName && (
          <span
            title={fileName}
            className="text-muted-foreground hidden min-w-0 truncate text-sm md:inline"
          >
            · {fileName}
          </span>
        )}
      </div>

      <GuideWords />

      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
        {ready && <ZoomControls />}
        <Button
          variant="ghost"
          onClick={pick}
          aria-label={t('open')}
          className="h-9 px-2.5 sm:px-3"
        >
          <FolderOpen />
          <span className="hidden sm:inline">{t('open')}</span>
        </Button>
        <Button
          disabled
          title={t('exportSoon')}
          aria-label={t('exportPdf')}
          className="h-9 px-2.5 sm:px-3.5"
        >
          <Download />
          <span className="hidden sm:inline">{t('exportPdf')}</span>
        </Button>
      </div>
    </header>
  )
}

/** Palabras guía: como en la cabeza de un diccionario, nombran lo que tienes a la vista. */
function GuideWords() {
  const t = useT()
  const status = useDocument((s) => s.status)
  const { first, last } = useDocument((s) => s.visible)
  const label =
    status !== 'ready'
      ? t('noDocument')
      : first === last
        ? t('page', { n: first })
        : t('pageRange', { a: first, b: last })

  return (
    <p
      aria-live="polite"
      className="guide-caps tabular text-ink-9 order-last col-span-2 hidden text-center text-[15px] lg:order-none lg:col-span-1 lg:block"
    >
      {label}
    </p>
  )
}

function ZoomControls() {
  const t = useT()
  const scale = useDocument(selectScale)
  const zoom = useDocument((s) => s.zoom)
  const setZoom = useDocument((s) => s.setZoom)

  return (
    <div
      className="mr-1 hidden items-center gap-0.5 md:flex"
      role="group"
      aria-label={t('zoomLevel', { n: toPercent(scale) })}
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('zoomOut')}
        onClick={() => setZoom(nextStep(scale, -1))}
      >
        <Minus />
      </Button>
      <span className="tabular text-ink-8 w-11 text-center text-sm">{toPercent(scale)}%</span>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('zoomIn')}
        onClick={() => setZoom(nextStep(scale, 1))}
      >
        <Plus />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('fitWidth')}
        aria-pressed={zoom === null}
        onClick={() => setZoom(null)}
        className="aria-pressed:text-ultramar"
      >
        <MoveHorizontal />
      </Button>
    </div>
  )
}
