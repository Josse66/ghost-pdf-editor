// Recolector de basura del PDF. Al borrar texto, el contenido viejo de la página queda en el
// archivo como objeto suelto (nadie lo usa, pero sigue ahí y se puede leer). Se quita todo lo
// que no se alcanza desde la raíz del documento.
import {
  PDFArray,
  PDFDict,
  PDFRef,
  PDFStream,
  type PDFDocument,
  type PDFObject,
} from '@cantoo/pdf-lib'

/** Referencias que ningún camino desde la raíz alcanza. */
export function unreachableRefs(doc: PDFDocument): PDFRef[] {
  const { context } = doc
  const seen = new Set<string>()
  const { Root, Info, Encrypt } = context.trailerInfo
  const stack: PDFObject[] = [Root, Info, Encrypt].filter((o): o is PDFObject => !!o)
  while (stack.length) {
    const obj = stack.pop()!
    if (obj instanceof PDFRef) {
      if (seen.has(obj.tag)) continue
      seen.add(obj.tag)
      const target = context.lookup(obj)
      if (target) stack.push(target)
    } else if (obj instanceof PDFDict) {
      stack.push(...obj.values())
    } else if (obj instanceof PDFArray) {
      stack.push(...obj.asArray())
    } else if (obj instanceof PDFStream) {
      stack.push(obj.dict)
    }
  }
  return context
    .enumerateIndirectObjects()
    .map(([ref]) => ref)
    .filter((ref) => !seen.has(ref.tag))
}

export function dropUnreachable(doc: PDFDocument): number {
  const refs = unreachableRefs(doc)
  for (const ref of refs) doc.context.delete(ref)
  return refs.length
}
