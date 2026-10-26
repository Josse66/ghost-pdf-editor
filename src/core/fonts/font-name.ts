// Interpreta el nombre interno de una fuente PDF ("AAAAAA+TimesNewRomanPS-BoldMT")
// para sacar la familia legible y si es negrita o cursiva; pdf.js deja bold/italic en null.

export interface ParsedFontName {
  family: string
  bold: boolean
  italic: boolean
}

const BOLD = /bold|black|heavy|semibold|demibold|demi\b/i
const ITALIC = /italic|oblique|\bit\b/i

export function parseFontName(raw: string): ParsedFontName {
  // Quita el prefijo de subconjunto ("ABCDEF+") que agregan los generadores de PDF.
  const name = raw.replace(/^[A-Z]{6}\+/, '')
  const [base = name, style = ''] = name.split(/[-,]/, 2)
  const family = base
    .replace(/(PSMT|PS|MT)$/, '')
    // "TimesNewRoman" → "Times New Roman"; respeta siglas como "DejaVu".
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()

  return {
    family: family || name,
    bold: BOLD.test(style) || BOLD.test(base),
    italic: ITALIC.test(style) || /Italic|Oblique/.test(base),
  }
}
