import type { CSSProperties } from 'react'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { useCurrentExport, warningsFor } from '@/store/export'

/**
 * Resultado de la última exportación, mientras siga describiendo las ediciones de ahora. Con
 * avisos o error toma la forma de aviso (título bermellón cerrado por regla); si todo salió
 * igual a lo que se ve, basta una línea de estado.
 */
export function ExportNotice({
  touch = false,
  className,
  style,
}: {
  touch?: boolean
  className?: string
  style?: CSSProperties
}) {
  const t = useT()
  const result = useCurrentExport()
  if (!result || result.status === 'idle' || result.status === 'working') return null
  const name = result.fileName ?? ''

  if (result.status === 'error') {
    return (
      <div role="alert" className={cn('border-vermilion border-b pb-4', className)} style={style}>
        <p className="text-vermilion text-[17px] font-semibold">{t('exportFailedTitle')}</p>
        <p className="text-ink-8 mt-1 text-[15px] leading-relaxed">{t('exportFailedBody')}</p>
      </div>
    )
  }

  const report = result.report!
  const warned = [...result.exported!.keys()].some((id) => warningsFor(report, id).length > 0)
  const missing = report.missingGlyphs.join(' ')

  if (!warned && !missing) {
    return (
      <p
        role="status"
        className={cn('text-ink-8 text-[15px] leading-relaxed', className)}
        style={style}
      >
        {t('exportDone', { name })}
      </p>
    )
  }

  return (
    <div role="status" className={cn('border-vermilion border-b pb-4', className)} style={style}>
      <p className="text-vermilion text-[17px] font-semibold">{t('exportWarnTitle')}</p>
      {warned && (
        <p className="text-ink-8 mt-1 text-[15px] leading-relaxed">
          {t(touch ? 'exportWarnBodyTouch' : 'exportWarnBody', { name })}
        </p>
      )}
      {missing && (
        <p className="text-ink-8 mt-1 text-[15px] leading-relaxed">
          {t('exportMissing', { chars: missing })}
        </p>
      )}
    </div>
  )
}
