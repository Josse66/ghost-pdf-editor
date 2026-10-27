import { create } from 'zustand'
import type { EditMap } from '@/core/edits/history'
import type { TextBlock } from '@/core/engine'
import type { ExportReport, ExportRequest } from '@/core/writer/export'
import { translate, useLang } from '@/i18n'
import type { ExportFailure, ExportReply, ExportStage } from '@/workers/export.worker'
import { useDocument } from './document'
import { useEdits } from './edits'

export type ExportWarning = 'notErased' | 'squeezed' | 'shrunk' | 'overflow'

interface ExportState {
  status: 'idle' | 'working' | 'done' | 'error'
  /** Qué está haciendo el worker: la primera vez baja el motor (~2 MB), y eso se nota en el celular. */
  stage: ExportStage | null
  /** Las ediciones que se exportaron: si cambian, el reporte ya no describe lo que hay. */
  exported: EditMap | null
  report: ExportReport | null
  failure: ExportFailure | null
  fileName: string | null
  /** Exporta lo que hay ahora; el botón y Ctrl/⌘ S llaman a esto. */
  run: () => Promise<void>
}

let worker: Worker | null = null

function callWorker(
  request: ExportRequest,
  onStage: (stage: ExportStage) => void,
): Promise<Exclude<ExportReply, { type: 'stage' }>> {
  worker ??= new Worker(new URL('../workers/export.worker.ts', import.meta.url), {
    type: 'module',
  })
  const w = worker
  return new Promise((resolve) => {
    w.onmessage = (e: MessageEvent<ExportReply>) => {
      if (e.data.type === 'stage') onStage(e.data.stage)
      else resolve(e.data)
    }
    w.onerror = (e) => {
      // Un worker que truena no se reutiliza.
      worker?.terminate()
      worker = null
      resolve({ type: 'error', failure: 'pdf', message: e.message })
    }
    w.postMessage(request)
  })
}

export const useExport = create<ExportState>((set, get) => ({
  status: 'idle',
  stage: null,
  exported: null,
  report: null,
  failure: null,
  fileName: null,

  async run() {
    if (get().status === 'working') return
    const { original, doc, fileName: source } = useDocument.getState()
    const { history, blocks } = useEdits.getState()
    if (!original || !doc || history.present.size === 0) return
    const present = history.present
    const suffix = translate(useLang.getState().lang, 'editedSuffix')
    const fileName = editedFileName(source ?? 'documento.pdf', suffix)
    set({
      status: 'working',
      stage: null,
      exported: present,
      report: null,
      failure: null,
      fileName,
    })

    try {
      const edits = [...present.values()]
      const pages = [...new Set(edits.map((e) => e.page))]
      // pdf.js ya está cargado (hay un documento abierto); se importa aquí para no meterlo en la entrada.
      const { engine } = await import('@/lib/engine')
      const pageLines = new Map<number, readonly TextBlock[]>()
      for (const page of pages) pageLines.set(page, await engine.getTextBlocks(page, 'line'))

      const reply = await callWorker(
        {
          original,
          edits,
          blocks: new Map(edits.map((e) => [e.blockId, blocks.get(e.blockId)!])),
          pages: doc.pages,
          pageLines,
        },
        (stage) => set({ stage }),
      )
      if (reply.type === 'error') {
        console.error('No se pudo exportar:', reply.message)
        set({ status: 'error', stage: null, failure: reply.failure })
        return
      }
      download(reply.bytes, fileName)
      set({ status: 'done', stage: null, report: reply.report })
    } catch (error) {
      console.error('No se pudo exportar:', error)
      set({ status: 'error', stage: null, failure: 'pdf' })
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
