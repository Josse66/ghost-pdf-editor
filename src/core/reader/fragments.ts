// Convierte los items de getTextContent() de pdf.js en fragmentos limpios con estilo.
// Solo describe la forma mínima que usamos de pdf.js, para no atar el núcleo a su API interna.
import type { TextStyle } from '../engine'
import { parseFontName } from '../fonts/font-name'
import { isEmptyFragment, normalizeText } from './normalize'

/** Lo que usamos de un item de texto de pdf.js. */
export interface RawTextItem {
  str: string
  /** Matriz [a, b, c, d, e, f]: escala/rotación y posición de la línea base. */
  transform: number[]
  width: number
  hasEOL: boolean
  fontName: string
}

/** Lo que usamos de los estilos que acompañan a getTextContent(). */
export interface RawTextStyle {
  ascent: number
  descent: number
  fontFamily: string
}

export interface TextFragment extends TextStyle {
  text: string
  /** Origen de la línea base, en puntos PDF. */
  x: number
  baseline: number
  /** Ancho a lo largo de la dirección del texto. */
  width: number
  /** Fracciones del tamaño de fuente, como las da pdf.js (descent es negativo). */
  ascent: number
  descent: number
  /** Grados, sentido antihorario. */
  rotation: number
}

/**
 * @param resolveFontName devuelve el nombre real de la fuente ("AAAAAA+Calibri-Bold") a partir del
 *   nombre que pdf.js le asigna ("g_d0_f1"), o undefined si aún no está cargada.
 */
export function toFragments(
  items: readonly RawTextItem[],
  styles: Readonly<Record<string, RawTextStyle>>,
  resolveFontName: (loadedName: string) => string | undefined,
): TextFragment[] {
  const fragments: TextFragment[] = []
  for (const item of items) {
    if (isEmptyFragment(item.str)) continue
    const [a = 1, b = 0, c = 0, d = 1, e = 0, f = 0] = item.transform
    const style = styles[item.fontName]
    const realName = resolveFontName(item.fontName) ?? style?.fontFamily ?? item.fontName
    const parsed = parseFontName(realName)

    fragments.push({
      text: normalizeText(item.str),
      x: e,
      baseline: f,
      width: item.width,
      fontSize: Math.hypot(c, d),
      ascent: style?.ascent ?? 0.8,
      descent: style?.descent ?? -0.2,
      rotation: normalizeAngle((Math.atan2(b, a) * 180) / Math.PI),
      fontName: realName,
      fontFamily: parsed.family,
      bold: parsed.bold,
      italic: parsed.italic,
    })
  }
  return fragments
}

function normalizeAngle(deg: number): number {
  const rounded = Math.round(deg)
  return ((rounded % 360) + 360) % 360
}
