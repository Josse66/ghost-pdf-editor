// Fuentes gemelas para pintar el texto editado. Se importan desde la capa de edición, que viaja en el
// chunk del visor: la entrada no las descarga, y el navegador solo baja el estilo y el alfabeto que
// se usen (unicode-range).
import '@fontsource/carlito/400.css'
import '@fontsource/carlito/400-italic.css'
import '@fontsource/carlito/700.css'
import '@fontsource/carlito/700-italic.css'
import '@fontsource/caladea/400.css'
import '@fontsource/caladea/400-italic.css'
import '@fontsource/caladea/700.css'
import '@fontsource/caladea/700-italic.css'
import '@fontsource/arimo/400.css'
import '@fontsource/arimo/400-italic.css'
import '@fontsource/arimo/700.css'
import '@fontsource/arimo/700-italic.css'
import '@fontsource/tinos/400.css'
import '@fontsource/tinos/400-italic.css'
import '@fontsource/tinos/700.css'
import '@fontsource/tinos/700-italic.css'
import '@fontsource/cousine/400.css'
import '@fontsource/cousine/400-italic.css'
import '@fontsource/cousine/700.css'
import '@fontsource/cousine/700-italic.css'
import '@fontsource/gelasio/400.css'
import '@fontsource/gelasio/400-italic.css'
import '@fontsource/gelasio/700.css'
import '@fontsource/gelasio/700-italic.css'
import type { TextStyle } from '@/core/engine'
import { substituteFor } from '@/core/fonts/substitutes'

/**
 * Espera a que las gemelas de estos estilos estén cargadas. Hasta entonces el navegador pinta con
 * la fuente de respaldo, y cualquier medida (línea base, ancho) saldría con otras métricas.
 */
export async function loadRunFonts(styles: readonly TextStyle[]): Promise<void> {
  const wanted = new Set(
    styles.map((s) => {
      const css = runCss(s, 1)
      return `${css.fontStyle} ${css.fontWeight} 16px ${css.fontFamily}`
    }),
  )
  await Promise.all([...wanted].map((font) => document.fonts.load(font).catch(() => [])))
}

/** Estilo CSS de un run pintado con su gemela, a la escala del visor. */
export function runCss(style: TextStyle, scale: number) {
  const { family } = substituteFor(style.fontFamily, style.generic)
  return {
    fontFamily: `'${family}', ${style.generic}`,
    fontWeight: style.bold ? 700 : 400,
    fontStyle: style.italic ? 'italic' : 'normal',
    fontSize: `${style.fontSize * scale}px`,
  } as const
}
