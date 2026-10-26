import { describe, expect, it } from 'vitest'
import { parseFontName } from './font-name'

describe('parseFontName', () => {
  it.each([
    ['AAAAAA+Calibri-Bold', { family: 'Calibri', bold: true, italic: false }],
    ['CAAAAA+Calibri-Italic', { family: 'Calibri', bold: false, italic: true }],
    ['BAAAAA+ArialMT', { family: 'Arial', bold: false, italic: false }],
    ['AAAAAA+Arial-BoldMT', { family: 'Arial', bold: true, italic: false }],
    ['AAAAAA+TimesNewRomanPS-BoldMT', { family: 'Times New Roman', bold: true, italic: false }],
    ['CourierNewPSMT', { family: 'Courier New', bold: false, italic: false }],
    ['Helvetica-BoldOblique', { family: 'Helvetica', bold: true, italic: true }],
    ['BAAAAA+Cambria', { family: 'Cambria', bold: false, italic: false }],
  ])('%s', (raw, expected) => {
    expect(parseFontName(raw)).toEqual(expected)
  })
})
