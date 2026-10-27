import {
  Download,
  FolderOpen,
  LoaderCircle,
  Maximize,
  Minus,
  MoveHorizontal,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFilePicker } from '@/hooks/useFileOpen'
import { useT } from '@/i18n'
import { nextStep, toPercent } from '@/lib/zoom'
import { selectScale, useDocument } from '@/store/document'
import { useEdits } from '@/store/edits'
import { useExport } from '@/store/export'
import { ChangesSheet } from '@/components/editor/ChangesSheet'
import { FileName } from './FileName'

export function TopBar() {
  const t = useT()
  const pick = useFilePicker()
  const status = useDocument((s) => s.status)
  const fileName = useDocument((s) => s.fileName)
  const ready = status === 'ready'

  return (
    // Cabeza carbón: el volumen más oscuro, sobre el que se apoya todo lo demás.
    <header className="bg-ink-10 box-content grid h-[58px] grid-cols-[1fr_auto] items-center gap-3 px-3 pt-[env(safe-area-inset-top)] sm:px-5 lg:grid-cols-[1fr_auto_1fr]">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="text-[15px] font-bold tracking-tight whitespace-nowrap text-white">
          {t('appName')}
        </span>
        {ready && fileName && (
          <span className="text-ink-3 hidden min-w-0 items-baseline gap-1 text-sm md:flex">
            <span aria-hidden>·</span>
            <FileName name={fileName} />
          </span>
        )}
      </div>

      <GuideWords />

      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
        {ready && <ZoomControls />}
        {ready && <ChangesSheet />}
        <Button variant="bar" onClick={pick} aria-label={t('open')} className="h-9 px-2.5 sm:px-3">
          <FolderOpen />
          <span className="hidden sm:inline">{t('open')}</span>
        </Button>
        <ExportButton />
      </div>
    </header>
  )
}

/** Exportar: siempre visible; se habilita en cuanto hay un cambio asentado. */
function ExportButton() {
  const t = useT()
  const ready = useDocument((s) => s.status === 'ready')
  const count = useEdits((s) => s.history.present.size)
  const working = useExport((s) => s.status === 'working')
  const stage = useExport((s) => s.stage)
  const run = useExport((s) => s.run)
  // La primera vez se baja el motor: decirlo explica la espera en una conexión lenta.
  const label = !working
    ? t('exportPdf')
    : stage === 'engine'
      ? t('exportPreparing')
      : t('exporting')

  return (
    <Button
      disabled={!ready || count === 0 || working}
      aria-busy={working}
      title={ready && count === 0 ? t('exportNothing') : `${t('exportPdf')} (Ctrl+S)`}
      aria-label={label}
      onClick={() => void run()}
      className="bg-glass hover:bg-glass/85 h-9 px-2.5 sm:px-3.5"
    >
      {working ? (
        <LoaderCircle className="animate-spin motion-reduce:animate-none" />
      ) : (
        <Download />
      )}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  )
}

/** Palabras guía: nombran lo que tienes a la vista (página o rango de páginas). */
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
      className="guide-caps tabular text-ink-2 order-last col-span-2 hidden text-center text-[15px] lg:order-none lg:col-span-1 lg:block"
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
        variant="bar"
        size="icon"
        aria-label={t('zoomOut')}
        onClick={() => setZoom(nextStep(scale, -1))}
      >
        <Minus />
      </Button>
      <span className="tabular text-ink-2 w-11 text-center text-sm">{toPercent(scale)}%</span>
      <Button
        variant="bar"
        size="icon"
        aria-label={t('zoomIn')}
        onClick={() => setZoom(nextStep(scale, 1))}
      >
        <Plus />
      </Button>
      <Button
        variant="bar"
        size="icon"
        aria-label={t('fitPage')}
        aria-pressed={zoom === 'page'}
        onClick={() => setZoom('page')}
      >
        <Maximize />
      </Button>
      <Button
        variant="bar"
        size="icon"
        aria-label={t('fitWidth')}
        aria-pressed={zoom === 'width'}
        onClick={() => setZoom('width')}
      >
        <MoveHorizontal />
      </Button>
    </div>
  )
}
