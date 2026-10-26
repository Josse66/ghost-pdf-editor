import { useSyncExternalStore } from 'react'

const query = '(pointer: fine)'

/** true con mouse o trackpad: donde arrastrar y soltar un archivo es posible. */
export function useFinePointer(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', notify)
      return () => media.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => true,
  )
}
