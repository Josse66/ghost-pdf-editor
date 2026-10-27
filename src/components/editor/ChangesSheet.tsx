import { ScrollText, X } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useFormatNumber, useT } from '@/i18n'
import { useEdits } from '@/store/edits'
import { ChangesList } from './ChangesPanel'

/**
 * Sin columna derecha (celular y tablet), los cambios viven en una hoja que sube desde abajo.
 * Es un <dialog> nativo: atrapa el foco, Esc lo cierra y el lector de pantalla lo anuncia.
 */
export function ChangesSheet() {
  const t = useT()
  const format = useFormatNumber()
  const count = useEdits((s) => s.history.present.size)
  const dialog = useRef<HTMLDialogElement>(null)
  const close = () => dialog.current?.close()

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => dialog.current?.showModal()}
        aria-label={`${t('changes')} · ${format(count)}`}
        className="h-9 gap-1 px-2.5 lg:hidden"
      >
        <ScrollText />
        <span className="tabular text-sm">{format(count)}</span>
      </Button>
      <dialog
        ref={dialog}
        aria-label={t('changes')}
        className="sheet"
        // Tocar el fondo oscurecido (fuera de la hoja) la cierra.
        onClick={(e) => {
          if (e.target === e.currentTarget) close()
        }}
      >
        <div className="flex max-h-[min(75dvh,40rem)] flex-col">
          <div className="flex justify-end px-3 pt-2">
            <Button variant="ghost" size="icon" onClick={close} aria-label={t('close')}>
              <X />
            </Button>
          </div>
          <div className="overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
            <ChangesList onNavigate={close} />
          </div>
        </div>
      </dialog>
    </>
  )
}
