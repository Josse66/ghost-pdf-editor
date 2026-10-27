// Borra de verdad el texto que se editó: PDFium quita los objetos de texto del contenido de la
// página (no se tapan con un rectángulo), así el texto viejo ya no se puede copiar ni buscar.
// Spike 3: PDFium parte el texto en muchos objetos, a veces uno por glifo, así que se borra por
// posición (lo que cae dentro de los renglones del bloque), no buscando el texto.
import { init, type WrappedPdfiumModule } from '@embedpdf/pdfium'
import type { Box, Rgb } from '../engine'

export type Pdfium = WrappedPdfiumModule

const FPDF_PAGEOBJ_TEXT = 1

/** Inicia PDFium con su wasm (en el navegador se descarga; en Node se lee del disco). */
export async function createPdfium(wasmBinary: ArrayBuffer): Promise<Pdfium> {
  const pdfium = await init({ wasmBinary })
  pdfium.PDFiumExt_Init()
  return pdfium
}

/** Zona a borrar: los renglones de un bloque editado. */
export interface EraseRegion {
  key: string
  page: number
  boxes: readonly Box[]
}

/** Un objeto de texto borrado: dónde estaba y de qué color era. */
export interface ErasedObject {
  box: Box
  color: Rgb
}

export interface EraseResult {
  bytes: Uint8Array
  /** Lo borrado por región. Una región sin nada borrado tiene el texto en otro lado (p. ej. un XObject). */
  erased: Map<string, ErasedObject[]>
}

export function eraseText(
  pdfium: Pdfium,
  original: Uint8Array,
  regions: readonly EraseRegion[],
): EraseResult {
  const { pdfium: mod } = pdfium
  // La memoria del wasm existe aunque los tipos del paquete no la declaren (Spike 3).
  const memory = (mod.wasmExports as unknown as { memory: WebAssembly.Memory }).memory
  // Se vuelve a leer cada vez: el buffer cambia si el wasm crece su memoria.
  const heap = () => new Uint8Array(memory.buffer)
  const malloc = (n: number) => mod.wasmExports.malloc(n)
  const free = (ptr: number) => mod.wasmExports.free(ptr)

  const dataPtr = malloc(original.length)
  heap().set(original, dataPtr)
  const doc = pdfium.FPDF_LoadMemDocument(dataPtr, original.length, '')
  if (!doc) {
    free(dataPtr)
    throw new Error(`PDFium no pudo abrir el PDF (error ${pdfium.FPDF_GetLastError()}).`)
  }

  const erased = new Map<string, ErasedObject[]>(regions.map((r) => [r.key, []]))
  // Cuatro floats para los límites y cuatro enteros para el color.
  const scratch = malloc(32)
  const float = (i: number) => mod.getValue(scratch + i * 4, 'float')
  const uint = (i: number) => mod.getValue(scratch + i * 4, 'i32') >>> 0

  try {
    const pages = [...new Set(regions.map((r) => r.page))]
    for (const pageNumber of pages) {
      const page = pdfium.FPDF_LoadPage(doc, pageNumber - 1)
      if (!page) throw new Error(`PDFium no pudo abrir la página ${pageNumber}.`)
      const onPage = regions.filter((r) => r.page === pageNumber)
      // De atrás para adelante: quitar un objeto recorre los índices de los que siguen.
      for (let i = pdfium.FPDFPage_CountObjects(page) - 1; i >= 0; i--) {
        const obj = pdfium.FPDFPage_GetObject(page, i)
        if (pdfium.FPDFPageObj_GetType(obj) !== FPDF_PAGEOBJ_TEXT) continue
        if (!pdfium.FPDFPageObj_GetBounds(obj, scratch, scratch + 4, scratch + 8, scratch + 12))
          continue
        const box = {
          x: float(0),
          y: float(1),
          width: float(2) - float(0),
          height: float(3) - float(1),
        }
        const region = onPage.find((r) => r.boxes.some((b) => centerInside(box, b)))
        if (!region) continue
        pdfium.FPDFPageObj_GetFillColor(obj, scratch, scratch + 4, scratch + 8, scratch + 12)
        const color: Rgb = [uint(0) / 255, uint(1) / 255, uint(2) / 255]
        if (!pdfium.FPDFPage_RemoveObject(page, obj)) continue
        pdfium.FPDFPageObj_Destroy(obj)
        erased.get(region.key)!.push({ box, color })
      }
      pdfium.FPDFPage_GenerateContent(page)
      pdfium.FPDF_ClosePage(page)
    }
    return { bytes: save(pdfium, doc, malloc, free, heap), erased }
  } finally {
    free(scratch)
    pdfium.FPDF_CloseDocument(doc)
    free(dataPtr)
  }
}

/** El centro del objeto cae en el renglón (con holgura vertical: las cajas de glifo varían). */
function centerInside(obj: Box, line: Box): boolean {
  const cx = obj.x + obj.width / 2
  const cy = obj.y + obj.height / 2
  const slack = line.height * 0.25
  return (
    cx >= line.x - 1 &&
    cx <= line.x + line.width + 1 &&
    cy >= line.y - slack &&
    cy <= line.y + line.height + slack
  )
}

/** Guardado completo: nada de versiones anteriores agregadas al final del archivo. */
function save(
  pdfium: Pdfium,
  doc: number,
  malloc: (n: number) => number,
  free: (ptr: number) => void,
  heap: () => Uint8Array,
): Uint8Array {
  const writer = pdfium.PDFiumExt_OpenFileWriter()
  try {
    if (!pdfium.PDFiumExt_SaveAsCopy(doc, writer)) throw new Error('PDFium no pudo guardar.')
    const size = pdfium.PDFiumExt_GetFileWriterSize(writer)
    const buf = malloc(size)
    pdfium.PDFiumExt_GetFileWriterData(writer, buf, size)
    const out = heap().slice(buf, buf + size)
    free(buf)
    return out
  } finally {
    pdfium.PDFiumExt_CloseFileWriter(writer)
  }
}
