import { useCallback, useEffect, useState } from 'react'
import { useDocument } from '@/store/document'
import { confirmDiscard } from '@/store/unsaved'

/** Abre el selector de archivos del sistema, filtrado a PDF. */
export function useFilePicker(): () => void {
  const openFile = useDocument((s) => s.openFile)
  return useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf,.pdf'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file && confirmDiscard()) void openFile(file)
    }
    input.click()
  }, [openFile])
}

/** Permite soltar un PDF en cualquier parte de la ventana; devuelve si hay un arrastre encima. */
export function useWindowFileDrop(): boolean {
  const openFile = useDocument((s) => s.openFile)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    // dragenter/dragleave se disparan por cada hijo: se cuentan para saber cuándo salió de verdad.
    let depth = 0
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false

    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth++
      setDragging(true)
    }
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const onLeave = () => {
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      const file = e.dataTransfer?.files[0]
      if (file && confirmDiscard()) void openFile(file)
    }

    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [openFile])

  return dragging
}
