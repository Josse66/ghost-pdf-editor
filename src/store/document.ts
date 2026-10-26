import { create } from 'zustand'
import type { LoadedDocument } from '@/core/engine'

export type OpenError = 'empty' | 'password' | 'invalid' | 'not-pdf' | 'unknown'
export type DebugMode = 'off' | 'line' | 'paragraph'

interface DocumentState {
  status: 'empty' | 'loading' | 'ready' | 'error'
  fileName: string | null
  doc: LoadedDocument | null
  error: OpenError | null
  progress: { read: number; total: number }
  /** Escala en px por punto PDF; null = ajustar al ancho. */
  zoom: number | null
  /** Escala que ajusta la página más ancha al visor; la calcula el visor al medir su ancho. */
  fitScale: number
  debug: DebugMode
  /** Rango de páginas visibles (para las palabras guía) y la página principal. */
  visible: { first: number; last: number }
  current: number
  /** Páginas ya leídas que no tienen texto (escaneos). */
  textless: ReadonlySet<number>
  openFile: (file: File) => Promise<void>
  setZoom: (zoom: number | null) => void
  setFitScale: (fitScale: number) => void
  setDebug: (debug: DebugMode) => void
  setVisible: (first: number, last: number, current: number) => void
  setPageHasText: (page: number, hasText: boolean) => void
}

let openSeq = 0

export const useDocument = create<DocumentState>((set, get) => ({
  status: 'empty',
  fileName: null,
  doc: null,
  error: null,
  progress: { read: 0, total: 0 },
  zoom: null,
  fitScale: 1,
  debug: 'off',
  visible: { first: 1, last: 1 },
  current: 1,
  textless: new Set(),

  async openFile(file) {
    const seq = ++openSeq
    set({
      status: 'loading',
      fileName: file.name,
      error: null,
      progress: { read: 0, total: 0 },
      textless: new Set(),
    })
    try {
      // El archivo se lee en memoria; nunca se sube a ningún lado.
      const data = await file.arrayBuffer()
      if (data.byteLength === 0) {
        set({ status: 'error', error: 'empty', doc: null })
        return
      }
      if (!looksLikePdf(data)) {
        set({ status: 'error', error: 'not-pdf', doc: null })
        return
      }
      // pdf.js (~700 KB) se descarga hasta que hay un PDF que abrir: la entrada carga ligera.
      const { engine } = await import('@/lib/engine')
      const doc = await engine.load(data, (read, total) => set({ progress: { read, total } }))
      // Si mientras tanto se abrió otro archivo, este resultado ya no importa.
      if (seq !== openSeq) return
      set({ status: 'ready', doc, zoom: null, visible: { first: 1, last: 1 }, current: 1 })
    } catch (error) {
      set({ status: 'error', error: classifyError(error), doc: null })
    }
  },

  setPageHasText: (page, hasText) => {
    const { textless } = get()
    if (textless.has(page) === !hasText) return
    const next = new Set(textless)
    if (hasText) next.delete(page)
    else next.add(page)
    set({ textless: next })
  },
  setZoom: (zoom) => set({ zoom }),
  setFitScale: (fitScale) => {
    if (Math.abs(get().fitScale - fitScale) > 0.001) set({ fitScale })
  },
  setDebug: (debug) => set({ debug }),
  setVisible: (first, last, current) => {
    const prev = get()
    if (prev.visible.first !== first || prev.visible.last !== last || prev.current !== current) {
      set({ visible: { first, last }, current })
    }
  },
}))

/** Un PDF empieza con "%PDF-" en el primer kilobyte. */
function looksLikePdf(data: ArrayBuffer): boolean {
  const head = new TextDecoder('latin1').decode(
    new Uint8Array(data, 0, Math.min(1024, data.byteLength)),
  )
  return head.includes('%PDF-')
}

function classifyError(error: unknown): OpenError {
  const name = error instanceof Error ? error.name : ''
  if (name === 'PasswordException') return 'password'
  if (name === 'InvalidPDFException' || name === 'FormatError') return 'invalid'
  return 'unknown'
}

/** Escala efectiva del visor. */
export const selectScale = (s: { zoom: number | null; fitScale: number }) => s.zoom ?? s.fitScale
