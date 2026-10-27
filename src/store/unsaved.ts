import { useEffect } from 'react'
import { translate, useLang } from '@/i18n'
import { useEdits } from './edits'
import { useExport } from './export'

/**
 * Hay cambios que se perderían: los cambios de ahora no son los de la última exportación que
 * terminó bien. Las ediciones viven solo en memoria (el autoguardado llega después).
 */
export function hasUnexportedChanges(): boolean {
  const present = useEdits.getState().history.present
  if (present.size === 0) return false
  const last = useExport.getState()
  return !(last.status === 'done' && last.exported === present)
}

/** Antes de reemplazar el documento: si hay cambios sin exportar, se pregunta. */
export function confirmDiscard(): boolean {
  if (!hasUnexportedChanges()) return true
  const n = useEdits.getState().history.present.size
  const lang = useLang.getState().lang
  return window.confirm(translate(lang, n === 1 ? 'discardOne' : 'discardMany', { n }))
}

/** Mientras haya cambios sin exportar, el navegador avisa antes de recargar o cerrar la pestaña. */
export function useUnsavedGuard() {
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnexportedChanges()) return
      e.preventDefault()
      // Algunos navegadores aún piden returnValue para mostrar el aviso.
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])
}
