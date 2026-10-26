import type { MessageKey } from '@/i18n/messages'
import type { DebugMode } from '@/store/document'

/** Modos de la revisión de cajas, compartidos por el panel de escritorio y el select de celular. */
export const DEBUG_MODES: { value: DebugMode; label: MessageKey }[] = [
  { value: 'off', label: 'debugOff' },
  { value: 'line', label: 'debugLines' },
  { value: 'paragraph', label: 'debugParagraphs' },
]
