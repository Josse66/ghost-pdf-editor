import type { CSSProperties } from 'react'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { useCurrentExport, useExport, warningsFor } from '@/store/export'

/** Cuerpo de aviso: los nombres de archivo sin espacios se parten antes que desbordar la columna. */
const BODY = 'text-ink-8 mt-1 text-[15px] leading-relaxed [overflow-wrap:anywhere]'

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
  const retry = useExport((s) => s.run)
  if (!result || result.status === 'idle' || result.status === 'working') return null
  const name = result.fileName ?? ''

  if (result.status === 'error') {
    return (
      <div role="alert" className={cn('border-vermilion border-b pb-4', className)} style={style}>
        <p className="text-vermilion text-[17px] font-semibold">{t('exportFailedTitle')}</p>
        <p className={BODY}>
          {t(result.failure === 'network' ? 'exportOfflineBody' : 'exportFailedBody')}
        </p>
        <Button variant="outline" size="sm" onClick={() => void retry()} className="mt-3">
          {t('retry')}
        </Button>
      </div>
    )
  }

  const report = result.report!
  const warned = [...result.exported!.keys()].some((id) => warningsFor(report, id).length > 0)
  const missing = report.missingGlyphs.join(' ')

  if (!warned && !missing) {
    return (
      <p role="status" className={cn(BODY, 'mt-0', className)} style={style}>
        {t('exportDone', { name })}
      </p>
    )
  }

  return (
    <div role="status" className={cn('border-vermilion border-b pb-4', className)} style={style}>
      <p className="text-vermilion text-[17px] font-semibold">{t('exportWarnTitle')}</p>
      {warned && (
        <p className={BODY}>{t(touch ? 'exportWarnBodyTouch' : 'exportWarnBody', { name })}</p>
      )}
      {missing && <p className={BODY}>{t('exportMissing', { chars: missing })}</p>}
    </div>
  )
}
