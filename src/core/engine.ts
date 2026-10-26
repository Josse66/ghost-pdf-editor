// Contrato del motor PDF. La UI y el store solo hablan con esta interfaz, nunca con
// pdf.js, @cantoo/pdf-lib o PDFium directamente, para poder cambiar de motor sin tocar React.
// TypeScript puro: nada de React aquí (ver CLAUDE.md).

/** Color RGB con canales de 0 a 1, como los usa PDF. */
export type Rgb = readonly [r: number, g: number, b: number]

/**
 * Unidad de edición: una línea (o párrafo) completa, no un fragmento suelto.
 * La Fase 0 mostró que editar fragmentos encima el texto con lo que sigue en la línea.
 * Geometría en puntos PDF, origen abajo-izquierda, sin rotación de página aplicada.
 */
export interface TextBlock {
  id: string
  /** Página, empezando en 1. */
  page: number
  x: number
  y: number
  width: number
  height: number
  baseline: number
  /** Rotación del texto en grados, sacada de la matriz de transformación. */
  rotation: number
  /** Texto original normalizado a NFC. */
  text: string
  /** Nombre interno del PDF, p. ej. "AAAAAA+Calibri-Bold". */
  fontName: string
  /** Familia normalizada, p. ej. "Calibri". */
  fontFamily: string
  bold: boolean
  italic: boolean
  fontSize: number
  color: Rgb
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

export interface PdfEngine {
  load(data: ArrayBuffer): Promise<LoadedDocument>
  getTextBlocks(page: number): Promise<TextBlock[]>
  exportWithEdits(edits: readonly Edit[]): Promise<Uint8Array>
  destroy(): Promise<void>
}
