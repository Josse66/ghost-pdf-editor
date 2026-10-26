import { useEffect } from 'react'
import { ChangesPanel } from '@/components/editor/ChangesPanel'
import { Definitions, EntryPlate } from '@/components/entry/EntryPlate'
import { TopBar } from '@/components/shell/TopBar'
import { PageList } from '@/components/viewer/PageList'
import { ThumbIndex } from '@/components/viewer/ThumbIndex'
import { useWindowFileDrop } from '@/hooks/useFileOpen'
import { useLang } from '@/i18n'
import { nextStep } from '@/lib/zoom'
import { selectScale, useDocument } from '@/store/document'

// Espacio de trabajo según .impeccable/surfaces/src-app-tsx.md:
// uñeros | lámina | cambios en escritorio; lámina a pantalla completa en celular.
export default function App() {
  const lang = useLang((s) => s.lang)
  const doc = useDocument((s) => s.doc)
  const status = useDocument((s) => s.status)
  const dragging = useWindowFileDrop()
  useZoomShortcuts()

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const ready = status === 'ready' && doc

  return (
    <div className="grid h-svh grid-rows-[auto_1fr] overflow-hidden">
      <TopBar />
      <div className="grid min-h-0 grid-cols-[2.75rem_1fr] lg:grid-cols-[5.5rem_1fr_22rem]">
        <aside className="border-rule min-h-0 border-r">
          {ready && <ThumbIndex numPages={doc.numPages} />}
        </aside>
        <main className="min-h-0 overflow-hidden">
          {ready ? (
            <PageList doc={doc} />
          ) : (
            <div className="h-full overflow-auto">
              <EntryPlate dragging={dragging} />
            </div>
          )}
        </main>
        <aside className="border-rule hidden min-h-0 border-l lg:block">
          {ready ? <ChangesPanel /> : <Definitions />}
        </aside>
      </div>
    </div>
  )
}

/** Ctrl/⌘ + y − acercan y alejan el PDF (no la página); Ctrl/⌘ 0 ajusta al ancho. */
function useZoomShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const state = useDocument.getState()
      if (state.status !== 'ready') return
      const scale = selectScale(state)
      if (e.key === '+' || e.key === '=') state.setZoom(nextStep(scale, 1))
      else if (e.key === '-') state.setZoom(nextStep(scale, -1))
      else if (e.key === '0') state.setZoom(null)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
