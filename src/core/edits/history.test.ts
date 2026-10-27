import { describe, expect, it } from 'vitest'
import {
  applyEdit,
  emptyHistory,
  redo,
  revertEdit,
  undo,
  type BlockEdit,
  type History,
} from './history'

const edit = (blockId: string, after: string, before = 'Ingeniero de Software'): BlockEdit => ({
  blockId,
  page: 1,
  before,
  after,
  runs: [{ text: after, style: 0 }],
  lines: after.split('\n'),
})

const texts = (h: History) => [...h.present.values()].map((e) => e.after)

describe('historial de ediciones', () => {
  it('asienta, deshace y rehace', () => {
    let h = applyEdit(emptyHistory, edit('p1-b3', 'Ingeniera de Software'))
    h = applyEdit(h, edit('p1-b3', 'Ingeniera de Software Sénior'))
    expect(texts(h)).toEqual(['Ingeniera de Software Sénior'])

    h = undo(h)
    expect(texts(h)).toEqual(['Ingeniera de Software'])
    h = undo(h)
    expect(texts(h)).toEqual([])
    h = redo(redo(h))
    expect(texts(h)).toEqual(['Ingeniera de Software Sénior'])
  })

  it('volver al texto original borra la edición (y se puede deshacer)', () => {
    let h = applyEdit(emptyHistory, edit('p1-b3', 'Ingeniera de Software'))
    h = applyEdit(h, edit('p1-b3', 'Ingeniero de Software'))
    expect(h.present.size).toBe(0)
    expect(texts(undo(h))).toEqual(['Ingeniera de Software'])
  })

  it('confirmar sin cambios no ensucia el historial', () => {
    const h = applyEdit(emptyHistory, edit('p1-b3', 'Ingeniera de Software'))
    expect(applyEdit(h, edit('p1-b3', 'Ingeniera de Software'))).toBe(h)
    expect(applyEdit(emptyHistory, edit('p1-b3', 'Ingeniero de Software'))).toBe(emptyHistory)
  })

  it('restaurar un bloque quita solo esa edición', () => {
    let h = applyEdit(emptyHistory, edit('p1-b3', 'Ingeniera de Software'))
    h = applyEdit(h, edit('p1-b0', 'Josefina Núñez Peña', 'José Núñez Peña'))
    h = revertEdit(h, 'p1-b3')
    expect(texts(h)).toEqual(['Josefina Núñez Peña'])
  })

  it('una edición nueva descarta lo que se podía rehacer', () => {
    let h = applyEdit(emptyHistory, edit('p1-b3', 'A'))
    h = undo(h)
    h = applyEdit(h, edit('p1-b3', 'B'))
    expect(h.future).toEqual([])
    expect(redo(h)).toBe(h)
  })
})
