import { create } from 'zustand'
import { messages, type Lang, type MessageKey } from './messages'

function detectLang(): Lang {
  const preferred = typeof navigator === 'undefined' ? [] : navigator.languages
  return preferred.some((l) => l.toLowerCase().startsWith('es')) || preferred.length === 0
    ? 'es'
    : 'en'
}

export const useLang = create<{ lang: Lang; setLang: (lang: Lang) => void }>((set) => ({
  lang: detectLang(),
  setLang: (lang) => set({ lang }),
}))

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string

const numberFormats = { es: new Intl.NumberFormat('es-MX'), en: new Intl.NumberFormat('en-US') }

/** Interpola {variables}; los números salen con el separador de miles del idioma. */
export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string | number>) {
  const template: string = messages[lang][key]
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = vars[name]
    return typeof value === 'number' ? numberFormats[lang].format(value) : String(value ?? '')
  })
}

/** Formatea un número suelto (uñeros, contadores) con el separador de miles del idioma. */
export function useFormatNumber(): (n: number) => string {
  const lang = useLang((s) => s.lang)
  return (n) => numberFormats[lang].format(n)
}

export function useT(): Translate {
  const lang = useLang((s) => s.lang)
  return (key, vars) => translate(lang, key, vars)
}
