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
    // Barra clara y delgada con una sola regla carbón: lo que describe el documento va en fichas
    // (archivo, página, zoom) y las acciones a la derecha.
    <header className="bg-ink-0 border-ink-10 box-content flex h-[52px] items-center gap-2.5 border-b px-3 pt-[env(safe-area-inset-top)] sm:px-5">
      <span className="mr-1.5 text-[16px] font-extrabold tracking-tight whitespace-nowrap">
        {t('appName')}
      </span>
      {ready && fileName && (
        <span className="token hidden min-w-0 md:flex">
          {t('fileToken')}
          <FileName name={fileName} className="text-ink-10 tracking-normal normal-case" />
        </span>
      )}
      {ready && <GuideWords />}
      {ready && <ZoomControls />}

      <div className="ml-auto flex items-center justify-end gap-1.5 sm:gap-2">
        {ready && <ChangesSheet />}
        <Button
          variant="outline"
          onClick={pick}
          aria-label={t('open')}
          className="border-ink-10 h-9 bg-transparent px-2.5 sm:px-3"
        >
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
      className="bg-ink-10 hover:bg-ink-9 h-9 px-2.5 sm:px-3.5"
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
    <p aria-live="polite" className="token tabular hidden lg:flex">
      <span className="text-ink-10">{label}</span>
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
      className="token hidden gap-0 py-0 pr-0.5 md:flex"
      role="group"
      aria-label={t('zoomLevel', { n: toPercent(scale) })}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('zoomOut')}
        onClick={() => setZoom(nextStep(scale, -1))}
      >
        <Minus />
      </Button>
      <span className="tabular text-ink-10 w-10 text-center">{toPercent(scale)}%</span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('zoomIn')}
        onClick={() => setZoom(nextStep(scale, 1))}
      >
        <Plus />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('fitPage')}
        aria-pressed={zoom === 'page'}
        onClick={() => setZoom('page')}
      >
        <Maximize />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('fitWidth')}
        aria-pressed={zoom === 'width'}
        onClick={() => setZoom('width')}
      >
        <MoveHorizontal />
      </Button>
    </div>
  )
}
