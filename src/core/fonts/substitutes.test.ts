import { describe, expect, it } from 'vitest'
import { substituteFor, toGeneric } from './substitutes'

describe('substituteFor', () => {
  it.each([
    ['Calibri', 'Carlito'],
    ['Cambria', 'Caladea'],
    ['Arial', 'Arimo'],
    ['Helvetica', 'Arimo'],
    ['Times New Roman', 'Tinos'],
    ['Courier New', 'Cousine'],
    ['Georgia', 'Gelasio'],
  ])('%s tiene gemela métrica: %s', (family, twin) => {
    expect(substituteFor(family, 'sans-serif')).toEqual({ family: twin, metricCompatible: true })
  })

  it('sin gemela (Aptos, el default de Office desde 2023) usa una parecida y lo dice', () => {
    expect(substituteFor('Aptos', 'sans-serif')).toEqual({
      family: 'Arimo',
      metricCompatible: false,
    })
    expect(substituteFor('Garamond', 'serif')).toEqual({ family: 'Tinos', metricCompatible: false })
  })
})

describe('toGeneric', () => {
  it.each([
    ['sans-serif', 'sans-serif'],
    ['serif', 'serif'],
    ['monospace', 'monospace'],
    [undefined, 'sans-serif'],
  ] as const)('%s → %s', (css, generic) => {
    expect(toGeneric(css)).toBe(generic)
  })
})
