// Ediciones del documento como historial inmutable: el PDF original nunca se toca en memoria;
// la exportación (Fase 4) aplica el estado presente. Deshacer/rehacer sale gratis de guardar
// fotos completas del mapa de ediciones, que es chico (una entrada por bloque editado).

/** Tramo del texto nuevo; hereda el estilo de un run del bloque original. */
export interface EditedRun {
  text: string
  /** Índice del run original (fuente, tamaño, negrita…) cuyo estilo usa. */
  style: number
}

export interface BlockEdit {
  blockId: string
  page: number
  /** Texto original del bloque: la entrada tachada y lo que vuelve al restaurar. */
  before: string
  /** Texto nuevo; las líneas se unen con "\n". */
  after: string
  runs: EditedRun[]
  /** Líneas tal como el editor las cortó en pantalla: la exportación las respeta (lo que ves es lo que sale). */
  lines: string[]
}

export type EditMap = ReadonlyMap<string, BlockEdit>

export interface History {
  past: EditMap[]
  present: EditMap
  future: EditMap[]
}

/** Suficiente para una sesión larga; cada foto solo guarda referencias a las ediciones. */
const MAX_UNDO = 200

export const emptyHistory: History = { past: [], present: new Map(), future: [] }

function commit(history: History, present: EditMap): History {
  if (present === history.present) return history
  return {
    past: [...history.past, history.present].slice(-MAX_UNDO),
    present,
    future: [],
  }
}

/** Asienta una edición; si el texto vuelve a ser el original, la edición desaparece. */
export function applyEdit(history: History, edit: BlockEdit): History {
  const prev = history.present.get(edit.blockId)
  if (edit.after === edit.before) {
    if (!prev) return history
    const next = new Map(history.present)
    next.delete(edit.blockId)
    return commit(history, next)
  }
  if (prev && prev.after === edit.after && sameRuns(prev.runs, edit.runs)) return history
  return commit(history, new Map(history.present).set(edit.blockId, edit))
}

export function revertEdit(history: History, blockId: string): History {
  if (!history.present.has(blockId)) return history
  const next = new Map(history.present)
  next.delete(blockId)
  return commit(history, next)
}

export function undo(history: History): History {
  const previous = history.past.at(-1)
  if (!previous) return history
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export function redo(history: History): History {
  const [next, ...rest] = history.future
  if (!next) return history
  return { past: [...history.past, history.present], present: next, future: rest }
}

function sameRuns(a: readonly EditedRun[], b: readonly EditedRun[]): boolean {
  return (
    a.length === b.length &&
    a.every((run, i) => run.text === b[i]!.text && run.style === b[i]!.style)
  )
}
