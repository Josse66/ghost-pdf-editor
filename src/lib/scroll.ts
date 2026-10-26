/** Lleva el visor a una página (uñeros, atajos). */
export function scrollToPage(page: number) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document
    .getElementById(`page-${page}`)
    ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
