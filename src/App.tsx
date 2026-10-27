import { lazy, Suspense, useEffect } from 'react'
import { ChangesPanel } from '@/components/editor/ChangesPanel'
import { Definitions, EntryPlate } from '@/components/entry/EntryPlate'
import { TopBar } from '@/components/shell/TopBar'
import { ThumbIndex } from '@/components/viewer/ThumbIndex'
import { useEditShortcuts } from '@/hooks/useEditShortcuts'
import { useWindowFileDrop } from '@/hooks/useFileOpen'
import { useLang } from '@/i18n'
import { nextStep } from '@/lib/zoom'
import { selectScale, useDocument } from '@/store/document'

// El visor trae pdf.js consigo; se carga junto con el primer PDF.
const PageList = lazy(() =>
  import('@/components/viewer/PageList').then((m) => ({ default: m.PageList })),
)

// Espacio de trabajo según .impeccable/surfaces/src-app-tsx.md:
// uñeros | lámina | cambios en escritorio; lámina a pantalla completa en celular.
export default function App() {
  const lang = useLang((s) => s.lang)
  const doc = useDocument((s) => s.doc)
  const status = useDocument((s) => s.status)
  const dragging = useWindowFileDrop()
  useZoomShortcuts()
  useEditShortcuts()

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const ready = status === 'ready' && doc

  return (
    // dvh sigue a la barra del navegador y al teclado; las zonas seguras dejan libre el notch.
    <div className="grid h-dvh grid-rows-[auto_1fr] overflow-hidden pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <TopBar />
      <div className="grid min-h-0 grid-cols-[2.75rem_1fr] lg:grid-cols-[5.5rem_1fr_22rem]">
        <aside className="border-rule chiseled min-h-0 border-r">
          {ready && <ThumbIndex numPages={doc.numPages} />}
        </aside>
        <main className="grid-plaza min-h-0 overflow-hidden">
          {ready ? (
            <Suspense>
              <PageList doc={doc} />
            </Suspense>
          ) : (
            <div className="h-full overflow-auto">
              <EntryPlate dragging={dragging} />
            </div>
          )}
        </main>
        <aside className="border-rule bg-ink-0 hidden min-h-0 border-l lg:block">
          {ready ? <ChangesPanel /> : <Definitions />}
        </aside>
      </div>
    </div>
  )
}

/** Ctrl/⌘ + y − acercan y alejan el PDF (no la página); Ctrl/⌘ 0 ajusta a la página. */
function useZoomShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const state = useDocument.getState()
      if (state.status !== 'ready') return
      const scale = selectScale(state)
      if (e.key === '+' || e.key === '=') state.setZoom(nextStep(scale, 1))
      else if (e.key === '-') state.setZoom(nextStep(scale, -1))
      else if (e.key === '0') state.setZoom('page')
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
