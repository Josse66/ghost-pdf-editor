import { create } from 'zustand'
import type { TextBlock } from '@/core/engine'
import {
  applyEdit,
  emptyHistory,
  redo,
  revertEdit,
  undo,
  type BlockEdit,
  type History,
} from '@/core/edits/history'

interface EditsState {
  history: History
  /** Bloque marcado (clic o toque); el siguiente doble clic, Enter o toque lo edita. */
  selected: string | null
  /** Bloque en edición y, si se entró con el puntero, dónde poner el cursor. */
  editing: { id: string; caret?: { x: number; y: number } } | null
  /** Bloques originales ya leídos, por id: la columna de cambios los usa para su «letra chiquita». */
  blocks: ReadonlyMap<string, TextBlock>
  select: (id: string | null) => void
  startEditing: (id: string, caret?: { x: number; y: number }) => void
  stopEditing: () => void
  commit: (edit: BlockEdit) => void
  revert: (id: string) => void
  undo: () => void
  redo: () => void
  registerBlocks: (blocks: readonly TextBlock[]) => void
  reset: () => void
}

export const useEdits = create<EditsState>((set, get) => ({
  history: emptyHistory,
  selected: null,
  editing: null,
  blocks: new Map(),

  select: (id) => set({ selected: id }),
  startEditing: (id, caret) => set({ selected: id, editing: { id, caret } }),
  stopEditing: () => set({ editing: null }),
  commit: (edit) => set({ history: applyEdit(get().history, edit), editing: null }),
  revert: (id) => set({ history: revertEdit(get().history, id) }),
  undo: () => set({ history: undo(get().history), editing: null }),
  redo: () => set({ history: redo(get().history), editing: null }),

  registerBlocks: (blocks) => {
    const known = get().blocks
    if (blocks.every((b) => known.has(b.id))) return
    const next = new Map(known)
    for (const block of blocks) next.set(block.id, block)
    set({ blocks: next })
  },

  reset: () => set({ history: emptyHistory, selected: null, editing: null, blocks: new Map() }),
}))
