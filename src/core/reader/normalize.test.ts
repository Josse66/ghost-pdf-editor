import { describe, expect, it } from 'vitest'
import { isEmptyFragment, normalizeText } from './normalize'

describe('normalizeText', () => {
  it('compone una vocal con acento combinante (casos vistos en el Spike 1)', () => {
    expect(normalizeText('párrafos')).toBe('párrafos')
  })

  it('convierte la i sin punto + acento en í', () => {
    expect(normalizeText('lı́nea')).toBe('línea')
  })

  it('deja intacto el texto ya normalizado', () => {
    expect(normalizeText('José Núñez Peña')).toBe('José Núñez Peña')
  })
})

describe('isEmptyFragment', () => {
  it('detecta los fragmentos vacíos que pdf.js usa como fin de línea', () => {
    expect(isEmptyFragment('')).toBe(true)
    expect(isEmptyFragment('  ')).toBe(true)
    expect(isEmptyFragment('Experiencia')).toBe(false)
  })
})
