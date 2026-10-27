// Gemelas para el PDF exportado. Fontsource reparte cada fuente en archivos por alfabeto (latin,
// latin-ext, griego…); cada carácter se dibuja con el primer archivo que tiene su glifo, y solo se
// embeben los archivos que se usan, recortados a sus glifos (convertidos antes de WOFF a TTF, el
// formato que entienden pdf-lib y los lectores). Ojo: la raya «–» de Carlito es más corta que la de
// Calibri aunque ocupe lo mismo; es el diseño de la gemela, no un error (Spike 4c).
import fontkit from '@cantoo/fontkit'
import type { PDFDocument, PDFFont } from '@cantoo/pdf-lib'
import { woffToSfnt } from '../fonts/woff'

/** Archivos WOFF de una gemela para un estilo, en orden de preferencia (latin, latin-ext…). */
export type FontSource = (
  family: string,
  bold: boolean,
  italic: boolean,
) => Promise<readonly Uint8Array[]>

export interface Segment {
  text: string
  font: PDFFont
}

interface FontFile {
  bytes: Uint8Array
  has: (codePoint: number) => boolean
  embedded?: PDFFont
}

/** Una gemela en un estilo, lista para partir texto por archivo y medirlo. */
export class TwinFont {
  /** Caracteres que ningún archivo tiene; salen como cuadrito y la app lo avisa. */
  readonly missing = new Set<string>()

  private readonly doc: PDFDocument
  private readonly files: FontFile[]

  private constructor(doc: PDFDocument, files: FontFile[]) {
    this.doc = doc
    this.files = files
  }

  static async load(doc: PDFDocument, bytes: readonly Uint8Array[]): Promise<TwinFont> {
    if (!bytes.length) throw new Error('La gemela no tiene archivos.')
    const files = await Promise.all(
      bytes.map(async (woff): Promise<FontFile> => {
        const sfnt = await woffToSfnt(woff)
        const font = fontkit.create(sfnt)
        if (!('hasGlyphForCodePoint' in font))
          throw new Error('Se esperaba una fuente, no una colección.')
        return { bytes: sfnt, has: (cp) => font.hasGlyphForCodePoint(cp) }
      }),
    )
    return new TwinFont(doc, files)
  }

  async segments(text: string): Promise<Segment[]> {
    const out: { text: string; file: FontFile }[] = []
    for (const ch of text) {
      const cp = ch.codePointAt(0)!
      let file = this.files.find((f) => f.has(cp))
      if (!file) {
        if (!/\s/.test(ch)) this.missing.add(ch)
        file = this.files[0]!
      }
      const last = out.at(-1)
      if (last && last.file === file) last.text += ch
      else out.push({ text: ch, file })
    }
    return Promise.all(out.map(async ({ text, file }) => ({ text, font: await this.embed(file) })))
  }

  async width(text: string, size: number): Promise<number> {
    const parts = await this.segments(text)
    return parts.reduce((sum, p) => sum + p.font.widthOfTextAtSize(p.text, size), 0)
  }

  private async embed(file: FontFile): Promise<PDFFont> {
    file.embedded ??= await this.doc.embedFont(file.bytes, {
      subset: true,
      // Sin ligaduras: «fi» o «ft» en un solo glifo se copian como basura («Soħa» por «Sofía»).
      features: { liga: false, clig: false, dlig: false },
    })
    return file.embedded
  }
}
