// Fuente libre que reemplaza a la del PDF cuando la original no trae los glifos nuevos.
// Las «gemelas» tienen los mismos anchos por carácter (Spike 2: Carlito sobre Calibri < 0.5 % de
// error), así que el texto editado ocupa lo mismo. Sin gemela, se usa una parecida por clase y la
// app debe avisarlo (PRODUCT.md: honestidad cuando no se puede).

export type GenericFamily = 'serif' | 'sans-serif' | 'monospace'

export interface Substitute {
  /** Familia libre, tal como la registra Fontsource. */
  family: string
  /** true = mismos anchos que la original; false = solo parecida. */
  metricCompatible: boolean
}

const TWINS: [RegExp, string][] = [
  [/^(calibri|carlito)$/i, 'Carlito'],
  [/^(cambria|caladea)( math)?$/i, 'Caladea'],
  [/^(arial|helvetica|liberation sans|arimo)( narrow)?$/i, 'Arimo'],
  [/^(times|times new roman|times roman|liberation serif|tinos)$/i, 'Tinos'],
  [/^(courier|courier new|liberation mono|cousine)$/i, 'Cousine'],
  [/^(georgia|gelasio)$/i, 'Gelasio'],
]

const BY_GENERIC: Record<GenericFamily, string> = {
  serif: 'Tinos',
  'sans-serif': 'Arimo',
  monospace: 'Cousine',
}

export function substituteFor(family: string, generic: GenericFamily): Substitute {
  const twin = TWINS.find(([pattern]) => pattern.test(family.trim()))
  if (twin) return { family: twin[1], metricCompatible: true }
  return { family: BY_GENERIC[generic], metricCompatible: false }
}

/** pdf.js describe cada fuente con una familia CSS de respaldo ("sans-serif", "serif"…). */
export function toGeneric(cssFamily: string | undefined): GenericFamily {
  if (!cssFamily) return 'sans-serif'
  if (/mono/i.test(cssFamily)) return 'monospace'
  if (/(^|[^-])serif/i.test(cssFamily) && !/sans/i.test(cssFamily)) return 'serif'
  return 'sans-serif'
}
