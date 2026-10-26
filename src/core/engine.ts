// Contrato del motor PDF. La UI y el store solo hablan con esta interfaz, nunca con
// pdf.js, @cantoo/pdf-lib o PDFium directamente, para poder cambiar de motor sin tocar React.
// TypeScript puro: nada de React aquí (ver CLAUDE.md).

/** Color RGB con canales de 0 a 1, como los usa PDF. */
export type Rgb = readonly [r: number, g: number, b: number]

/** Rectángulo en puntos PDF, origen abajo-izquierda, sin rotación de página aplicada. */
export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/** Estilo de un tramo de texto. */
export interface TextStyle {
  /** Nombre interno del PDF, p. ej. "AAAAAA+Calibri-Bold". */
  fontName: string
  /** Familia normalizada, p. ej. "Calibri". */
  fontFamily: string
  bold: boolean
  italic: boolean
  fontSize: number
  /** Se conoce desde la Fase 4 (operator list o PDFium); pdf.js no lo da en getTextContent. */
  color?: Rgb
}

/** Tramo de una línea con un solo estilo (p. ej. «Ingeniero de Software» en negrita). */
export interface TextRun extends Box, TextStyle {
  text: string
}

/**
 * Unidad de edición: una línea (o párrafo) completa, no un fragmento suelto.
 * La Fase 0 mostró que editar fragmentos encima el texto con lo que sigue en la línea.
 */
export interface TextBlock extends Box {
  id: string
  kind: 'line' | 'paragraph'
  /** Página, empezando en 1. */
  page: number
  /** Línea base de la primera línea. */
  baseline: number
  /** Rotación del texto en grados, sacada de la matriz de transformación. */
  rotation: number
  /** Texto normalizado a NFC; las líneas de un párrafo se unen con "\n". */
  text: string
  runs: TextRun[]
  /** Solo en párrafos: sus líneas en orden de lectura. */
  lines?: TextBlock[]
}

/** Una edición pendiente. El documento original nunca se modifica en memoria. */
export interface Edit {
  blockId: string
  newText: string
}

export interface PageInfo {
  page: number
  /** Tamaño en puntos PDF, ya con la rotación de página aplicada. */
  width: number
  height: number
  /** Rotación de la página: 0, 90, 180 o 270. */
  rotate: number
}

export interface LoadedDocument {
  numPages: number
  pages: PageInfo[]
}

export interface RenderTarget {
  canvas: HTMLCanvasElement | OffscreenCanvas
  /** Píxeles por punto PDF (ya multiplicado por devicePixelRatio). */
  scale: number
  signal?: AbortSignal
}

export interface PdfEngine {
  load(data: ArrayBuffer): Promise<LoadedDocument>
  /** Bloques de una página: por línea o agrupados en párrafos. */
  getTextBlocks(page: number, kind?: TextBlock['kind']): Promise<TextBlock[]>
  renderPage(page: number, target: RenderTarget): Promise<void>
  exportWithEdits(edits: readonly Edit[]): Promise<Uint8Array>
  destroy(): Promise<void>
}
