// Colores de un bloque leídos del render: el fondo (para tapar el texto original sin que se note)
// y la tinta (para escribir el nuevo del mismo color). Probado en el Spike 2: con fondo sólido el
// color sale exacto; con degradado, `spread` lo delata.
import type { Rgb } from '../engine'

/** Lo mínimo de un ImageData. */
export interface Pixels {
  data: ArrayLike<number>
  width: number
  height: number
}

export interface Background {
  rgb: Rgb
  /** Suma de los rangos por canal en el anillo (0–765). Alto = fondo no uniforme. */
  spread: number
}

/** Mediana por canal de un anillo de `pad` píxeles en el borde de la imagen. */
export function sampleBackground(img: Pixels, pad: number): Background {
  const channels: [number[], number[], number[]] = [[], [], []]
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const ring = x < pad || y < pad || x >= img.width - pad || y >= img.height - pad
      if (!ring) continue
      const i = (y * img.width + x) * 4
      for (let c = 0; c < 3; c++) channels[c as 0 | 1 | 2].push(img.data[i + c]!)
    }
  }
  if (!channels[0].length) return { rgb: [1, 1, 1], spread: 0 }
  const rgb = channels.map((values) => median(values) / 255) as unknown as Rgb
  const spread = channels.reduce((sum, v) => sum + Math.max(...v) - Math.min(...v), 0)
  return { rgb, spread }
}

/** El píxel más alejado del fondo: la tinta del texto, aunque el texto sea delgado. */
export function sampleInk(img: Pixels, background: Rgb): Rgb {
  let best: Rgb = [0, 0, 0]
  let bestDistance = -1
  for (let i = 0; i < img.data.length; i += 4) {
    const c: Rgb = [img.data[i]! / 255, img.data[i + 1]! / 255, img.data[i + 2]! / 255]
    const d = Math.hypot(c[0] - background[0], c[1] - background[1], c[2] - background[2])
    if (d > bestDistance) {
      bestDistance = d
      best = c
    }
  }
  return best
}

export function toCss([r, g, b]: Rgb): string {
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]!
}
