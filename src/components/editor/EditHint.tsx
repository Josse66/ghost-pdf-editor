import type { CSSProperties } from 'react'
import { useFinePointer } from '@/hooks/usePointer'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { useEdits } from '@/store/edits'

/**
 * Cómo se edita, a la vista hasta el primer cambio. En escritorio vive en la columna de Cambios;
 * sin ella (celular), va sobre la hoja: si no, nadie descubre que se edita tocando dos veces.
 */
export function EditHint({ className, style }: { className?: string; style?: CSSProperties }) {
  const t = useT()
  const finePointer = useFinePointer()
  const count = useEdits((s) => s.history.present.size)
  if (count > 0) return null
  return (
    <p className={cn('text-ink-8 text-[15px] leading-snug', className)} style={style}>
      {finePointer ? t('changesHintMouse') : t('changesHintTouch')}
    </p>
  )
}
