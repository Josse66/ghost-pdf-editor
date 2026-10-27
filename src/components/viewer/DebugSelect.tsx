import type { CSSProperties } from 'react'
import { useId } from 'react'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'
import { useDocument, type DebugMode } from '@/store/document'
import { DEBUG_MODES } from './debug-modes'

/** Revisión de cajas en pantallas sin columna derecha (al fondo de la hoja de Cambios): un select
 * nativo, el control que el celular ya sabe usar. */
export function DebugSelect({ className, style }: { className?: string; style?: CSSProperties }) {
  const t = useT()
  const id = useId()
  const debug = useDocument((s) => s.debug)
  const setDebug = useDocument((s) => s.setDebug)

  return (
    <div className={cn('flex items-center justify-end gap-2 text-sm', className)} style={style}>
      <label htmlFor={id} className="text-ink-8">
        {t('debugTitle')}
      </label>
      <select
        id={id}
        value={debug}
        onChange={(e) => setDebug(e.target.value as DebugMode)}
        className="border-input bg-ink-0 h-9 rounded-md border px-2 text-base sm:text-sm"
      >
        {DEBUG_MODES.map((mode) => (
          <option key={mode.value} value={mode.value}>
            {t(mode.label)}
          </option>
        ))}
      </select>
    </div>
  )
}
