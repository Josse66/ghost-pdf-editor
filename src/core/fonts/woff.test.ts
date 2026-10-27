import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import fontkit from '@cantoo/fontkit'
import { isWoff, woffToSfnt } from './woff'

const FILE = 'node_modules/@fontsource/carlito/files/carlito-latin-400-italic.woff'

describe('woffToSfnt', () => {
  it('saca una TrueType con los mismos glifos y medidas que el WOFF', async () => {
    const woff = new Uint8Array(await readFile(FILE))
    const ttf = await woffToSfnt(woff)
    expect(isWoff(ttf)).toBe(false)
    expect(new DataView(ttf.buffer).getUint32(0)).toBe(0x00010000)

    const a = fontkit.create(woff)
    const b = fontkit.create(ttf)
    if (!('glyphForCodePoint' in a) || !('glyphForCodePoint' in b)) throw new Error('colección')
    for (const ch of 'Aé–—ñ(2') {
      const cp = ch.codePointAt(0)!
      expect(b.glyphForCodePoint(cp)!.id).toBe(a.glyphForCodePoint(cp)!.id)
      expect(b.glyphForCodePoint(cp)!.advanceWidth).toBe(a.glyphForCodePoint(cp)!.advanceWidth)
    }
  })

  it('deja pasar una fuente que ya no es WOFF', async () => {
    const plain = new Uint8Array([0, 1, 0, 0, 1, 2, 3])
    expect(await woffToSfnt(plain)).toBe(plain)
  })
})
