// Zoom expresado como escala en px CSS por punto PDF. 100% = 96/72, como los visores de PDF.
export const CSS_PER_PT = 96 / 72
const STEPS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 3].map((p) => p * CSS_PER_PT)
const MIN = STEPS[0]!
const MAX = STEPS.at(-1)!

export const clampScale = (scale: number) => Math.min(MAX, Math.max(MIN, scale))

export const toPercent = (scale: number) => Math.round((scale / CSS_PER_PT) * 100)

export function nextStep(scale: number, direction: 1 | -1): number {
  if (direction === 1) return STEPS.find((s) => s > scale + 0.001) ?? MAX
  return [...STEPS].reverse().find((s) => s < scale - 0.001) ?? MIN
}

/** Límites al pellizcar: hasta el zoom máximo, y hacia abajo hasta ver la página completa. */
export function pinchScale(scale: number, fitPage: number): number {
  return Math.min(MAX, Math.max(Math.min(MIN, fitPage), scale))
}

/**
 * Límites para una escala de ajuste (a página o al ancho). Puede bajar del zoom mínimo manual:
 * en un celular la página tiene que caber aunque quede chica.
 */
export function fitScale(scale: number): number {
  return Math.min(MAX, Math.max(0.2, scale))
}
