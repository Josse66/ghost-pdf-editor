// WOFF 1.0 → TTF/OTF. Un WOFF es la misma fuente con cada tabla comprimida con zlib; los PDF
// necesitan la fuente sin envoltura (FontFile2): pdf-lib embebe el WOFF tal cual si no se recorta.
// Formato: https://www.w3.org/TR/WOFF/

const WOFF_SIGNATURE = 0x774f4646 // 'wOFF'

export function isWoff(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    new DataView(bytes.buffer, bytes.byteOffset).getUint32(0) === WOFF_SIGNATURE
  )
}

/** Descomprime zlib con la API del navegador (también existe en Node 18+). */
async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export async function woffToSfnt(woff: Uint8Array): Promise<Uint8Array> {
  if (!isWoff(woff)) return woff
  const view = new DataView(woff.buffer, woff.byteOffset, woff.byteLength)
  const flavor = view.getUint32(4)
  const numTables = view.getUint16(12)

  const tables: { tag: number; checksum: number; data: Uint8Array }[] = []
  for (let i = 0; i < numTables; i++) {
    const entry = 44 + i * 20
    const offset = view.getUint32(entry + 4)
    const compLength = view.getUint32(entry + 8)
    const origLength = view.getUint32(entry + 12)
    const raw = woff.subarray(offset, offset + compLength)
    const data = compLength < origLength ? await inflate(raw) : raw
    if (data.length !== origLength) throw new Error('WOFF dañado: una tabla no mide lo que dice.')
    tables.push({ tag: view.getUint32(entry), checksum: view.getUint32(entry + 16), data })
  }

  const pad4 = (n: number) => (n + 3) & ~3
  const headerSize = 12 + numTables * 16
  const total = tables.reduce((sum, t) => sum + pad4(t.data.length), headerSize)
  const out = new Uint8Array(total)
  const dv = new DataView(out.buffer)

  // Encabezado sfnt: searchRange y compañía según la potencia de 2 que cabe en numTables.
  const power = 2 ** Math.floor(Math.log2(numTables))
  dv.setUint32(0, flavor)
  dv.setUint16(4, numTables)
  dv.setUint16(6, power * 16)
  dv.setUint16(8, Math.log2(power))
  dv.setUint16(10, numTables * 16 - power * 16)

  // Las tablas van ordenadas por etiqueta en el directorio, como pide el formato.
  let offset = headerSize
  tables
    .sort((a, b) => a.tag - b.tag)
    .forEach((table, i) => {
      const entry = 12 + i * 16
      dv.setUint32(entry, table.tag)
      dv.setUint32(entry + 4, table.checksum)
      dv.setUint32(entry + 8, offset)
      dv.setUint32(entry + 12, table.data.length)
      out.set(table.data, offset)
      offset += pad4(table.data.length)
    })
  return out
}
