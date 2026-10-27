import { create } from 'zustand'
import type { EditMap } from '@/core/edits/history'
import type { TextBlock } from '@/core/engine'
import type { ExportReport, ExportRequest } from '@/core/writer/export'
import type { ExportReply } from '@/workers/export.worker'
import { useDocument } from './document'
import { useEdits } from './edits'

export type ExportWarning = 'notErased' | 'squeezed' | 'shrunk' | 'overflow'

interface ExportState {
  status: 'idle' | 'working' | 'done' | 'error'
  /** Las ediciones que se exportaron: si cambian, el reporte ya no describe lo que hay. */
  exported: EditMap | null
  report: ExportReport | null
  fileName: string | null
  run: (fileName: string) => Promise<void>
}

let worker: Worker | null = null

function callWorker(request: ExportRequest): Promise<ExportReply> {
  worker ??= new Worker(new URL('../workers/export.worker.ts', import.meta.url), {
    type: 'module',
  })
  const w = worker
  return new Promise((resolve) => {
    w.onmessage = (e: MessageEvent<ExportReply>) => resolve(e.data)
    w.onerror = (e) => {
      // Un worker que truena no se reutiliza.
      worker?.terminate()
      worker = null
      resolve({ type: 'error', message: e.message })
    }
    w.postMessage(request)
  })
}

export const useExport = create<ExportState>((set, get) => ({
  status: 'idle',
  exported: null,
  report: null,
  fileName: null,

  async run(fileName) {
    if (get().status === 'working') return
    const { original, doc } = useDocument.getState()
    const { history, blocks } = useEdits.getState()
    if (!original || !doc || history.present.size === 0) return
    const present = history.present
    set({ status: 'working', exported: present, report: null, fileName })

    try {
      const edits = [...present.values()]
      const pages = [...new Set(edits.map((e) => e.page))]
      // pdf.js ya está cargado (hay un documento abierto); se importa aquí para no meterlo en la entrada.
      const { engine } = await import('@/lib/engine')
      const pageLines = new Map<number, readonly TextBlock[]>()
      for (const page of pages) pageLines.set(page, await engine.getTextBlocks(page, 'line'))

      const reply = await callWorker({
        original,
        edits,
        blocks: new Map(edits.map((e) => [e.blockId, blocks.get(e.blockId)!])),
        pages: doc.pages,
        pageLines,
      })
      if (reply.type === 'error') throw new Error(reply.message)
      download(reply.bytes, fileName)
      set({ status: 'done', report: reply.report })
    } catch (error) {
      console.error('No se pudo exportar:', error)
      set({ status: 'error', report: null })
    }
  },
}))

/** El resultado de la última exportación, solo si describe las ediciones que hay ahora. */
export function useCurrentExport() {
  const present = useEdits((s) => s.history.present)
  const state = useExport()
  return state.exported === present ? state : null
}

/** Avisos de la última exportación para un bloque. */
export function warningsFor(report: ExportReport, blockId: string): ExportWarning[] {
  return (['notErased', 'squeezed', 'shrunk', 'overflow'] as const).filter((key) =>
    report[key].includes(blockId),
  )
}

/** «Contrato.pdf» → «Contrato-editado.pdf». */
export function editedFileName(name: string, suffix: string): string {
  return `${name.replace(/\.pdf$/i, '')}-${suffix}.pdf`
}

function download(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Safari todavía puede estar leyendo el blob justo después del clic.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
