import { useEffect } from 'react'
import { useEdits } from '@/store/edits'
import { useExport } from '@/store/export'

/**
 * Ctrl/⌘ Z deshace, Ctrl/⌘ Shift Z o Ctrl Y rehace, Ctrl/⌘ S exporta, Esc suelta la selección.
 * Dentro del editor de texto manda el deshacer nativo del navegador (letra por letra), no el del
 * documento.
 */
export function useEditShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.isContentEditable || target?.closest('input, textarea, select')) return
      const state = useEdits.getState()
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      // Ctrl/⌘ S exporta en vez de guardar la página web, que no le sirve a nadie aquí.
      if (mod && key === 's') void useExport.getState().run()
      else if (mod && key === 'z' && !e.shiftKey) state.undo()
      else if (mod && ((key === 'z' && e.shiftKey) || key === 'y')) state.redo()
      else if (e.key === 'Escape' && state.selected) state.select(null)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
