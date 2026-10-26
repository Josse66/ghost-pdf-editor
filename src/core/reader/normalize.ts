// pdf.js puede entregar texto descompuesto (p. ej. "ı" + acento combinante en lugar de "í")
// y fragmentos vacíos que solo marcan fin de línea. Todo texto pasa por aquí antes de agruparse.

/** Normaliza a NFC y convierte la "i" sin punto + acento combinante en su letra acentuada. */
export function normalizeText(raw: string): string {
  return raw.replace(/ı(\p{M})/gu, 'i$1').normalize('NFC')
}

/** Un fragmento es vacío si no tiene ningún carácter visible. */
export function isEmptyFragment(raw: string): boolean {
  return raw.trim().length === 0
}
