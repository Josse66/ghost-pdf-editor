import { cn } from '@/lib/utils'

/** Caracteres finales que siempre se ven: distinguen "final.pdf" de "final-FINAL(3).pdf". */
const TAIL = 16

/**
 * Nombre de archivo truncado a la mitad: el inicio cede espacio y el final con la extensión se
 * queda, porque los archivos de una misma persona suelen diferir al final.
 */
export function FileName({ name, className }: { name: string; className?: string }) {
  const head = name.length > TAIL ? name.slice(0, -TAIL) : ''
  const tail = name.length > TAIL ? name.slice(-TAIL) : name
  return (
    <span title={name} className={cn('flex min-w-0', className)}>
      <span className="truncate">{head}</span>
      <span className="shrink-0 whitespace-pre">{tail}</span>
    </span>
  )
}
