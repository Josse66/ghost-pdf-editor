// TODAS las conversiones entre puntos PDF (origen abajo-izquierda) y píxeles de pantalla
// (origen arriba-izquierda) pasan por aquí. Replica la matriz de PageViewport de pdf.js para
// que el overlay coincida con el canvas aunque la página esté rotada o tenga CropBox desplazado.
import type { Box } from './engine'

/** Caja visible de la página en puntos PDF: [x0, y0, x1, y1]. */
export type ViewBox = readonly [x0: number, y0: number, x1: number, y1: number]

/** Matriz afín [a, b, c, d, e, f]: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Matrix = readonly [number, number, number, number, number, number]

export function viewportTransform(view: ViewBox, rotate: number, scale: number): Matrix {
  const [x0, y0, x1, y1] = view
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const [ra, rb, rc, rd] = ROTATIONS[((rotate % 360) + 360) % 360] ?? ROTATIONS[0]!
  // Con 90° o 270° el ancho y el alto de la página se intercambian en pantalla.
  const offsetX = (ra === 0 ? Math.abs(cy - y0) : Math.abs(cx - x0)) * scale
  const offsetY = (ra === 0 ? Math.abs(cx - x0) : Math.abs(cy - y0)) * scale
  return [
    ra * scale,
    rb * scale,
    rc * scale,
    rd * scale,
    offsetX - ra * scale * cx - rc * scale * cy,
    offsetY - rb * scale * cx - rd * scale * cy,
  ]
}

const ROTATIONS: Record<number, readonly [number, number, number, number]> = {
  0: [1, 0, 0, -1],
  90: [0, 1, 1, 0],
  180: [-1, 0, 0, 1],
  270: [0, -1, -1, 0],
}

export function applyMatrix(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
}

/** Caja en puntos PDF → rectángulo en píxeles (left, top, width, height). */
export function toScreenRect(
  m: Matrix,
  box: Box,
): { left: number; top: number; width: number; height: number } {
  const [ax, ay] = applyMatrix(m, box.x, box.y)
  const [bx, by] = applyMatrix(m, box.x + box.width, box.y + box.height)
  return {
    left: Math.min(ax, bx),
    top: Math.min(ay, by),
    width: Math.abs(bx - ax),
    height: Math.abs(by - ay),
  }
}
