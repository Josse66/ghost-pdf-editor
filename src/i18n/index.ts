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

export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string | number>) {
  const template: string = messages[lang][key]
  return vars
    ? template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''))
    : template
}

export function useT(): Translate {
  const lang = useLang((s) => s.lang)
  return (key, vars) => translate(lang, key, vars)
}
