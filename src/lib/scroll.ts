const behavior = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

/** Lleva el visor a una página (uñeros, atajos). */
export function scrollToPage(page: number) {
  document.getElementById(`page-${page}`)?.scrollIntoView({ behavior: behavior(), block: 'start' })
}

/**
 * Lleva el visor a un bloque y le da el foco. La capa de edición solo existe en páginas cercanas,
 * así que primero se va a la página y luego se espera a que el bloque aparezca.
 */
export function scrollToBlock(page: number, blockId: string) {
  const find = () => document.querySelector<HTMLElement>(`[data-hit="${CSS.escape(blockId)}"]`)
  const reveal = (el: HTMLElement) => {
    el.scrollIntoView({ behavior: behavior(), block: 'center' })
    el.focus({ preventScroll: true })
  }
  const now = find()
  if (now) return reveal(now)
  scrollToPage(page)
  let tries = 0
  const wait = () => {
    const el = find()
    if (el) reveal(el)
    else if (++tries < 40) requestAnimationFrame(wait)
  }
  requestAnimationFrame(wait)
}
