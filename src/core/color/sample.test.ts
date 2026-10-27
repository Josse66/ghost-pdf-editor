import { describe, expect, it } from 'vitest'
import { sampleBackground, sampleInk, toCss, type Pixels } from './sample'

/** Imagen sintética: fondo de un color y un "trazo" de tinta en el centro. */
function image(w: number, h: number, bg: number[], ink?: number[]): Pixels {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const center = ink && x >= w / 3 && x < (2 * w) / 3 && y >= h / 3 && y < (2 * h) / 3
      const [r, g, b] = center ? ink : bg
      data.set([r!, g!, b!, 255], (y * w + x) * 4)
    }
  }
  return { data, width: w, height: h }
}

describe('sampleBackground', () => {
  it('lee el azul sólido de un encabezado de factura', () => {
    const bg = sampleBackground(image(30, 12, [11, 83, 148], [255, 255, 255]), 3)
    expect(toCss(bg.rgb)).toBe('rgb(11 83 148)')
    expect(bg.spread).toBe(0)
  })

  it('delata un degradado con un spread alto', () => {
    const w = 40
    const data = new Uint8ClampedArray(w * 10 * 4)
    for (let i = 0; i < w * 10; i++) data.set([((i % w) / w) * 255, 50, 120, 255], i * 4)
    expect(sampleBackground({ data, width: w, height: 10 }, 2).spread).toBeGreaterThan(200)
  })
})

describe('sampleInk', () => {
  it('encuentra el color del texto aunque ocupe poco', () => {
    const img = image(30, 12, [255, 255, 255], [31, 56, 100])
    expect(toCss(sampleInk(img, [1, 1, 1]))).toBe('rgb(31 56 100)')
  })
})
