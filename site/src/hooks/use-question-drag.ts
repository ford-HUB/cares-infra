import { useCallback, useState, type DragEvent } from 'react'

const DRAG_MIME = 'application/x-cares-question-index'

/** Only the index travels with the drag; the store does the move. */
export function useQuestionDrag(moveQuestion: (from: number, to: number) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const onDragStart = useCallback(
    (index: number) => (event: DragEvent<HTMLDivElement>) => {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData(DRAG_MIME, String(index))
      const card = event.currentTarget.closest('[data-question-id]')
      if (card instanceof HTMLElement) {
        event.dataTransfer.setDragImage(card, 24, 12)
      }
      setDragIndex(index)
    },
    [],
  )

  const onDragOver = useCallback(
    (index: number) => (event: DragEvent<HTMLDivElement>) => {
      if (dragIndex === null) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      if (index !== overIndex) setOverIndex(index)
    },
    [dragIndex, overIndex],
  )

  const onDrop = useCallback(
    (index: number) => (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const from = Number(event.dataTransfer.getData(DRAG_MIME))
      if (!Number.isNaN(from) && from !== index) moveQuestion(from, index)
      setDragIndex(null)
      setOverIndex(null)
    },
    [moveQuestion],
  )

  const onDragEnd = useCallback(() => {
    setDragIndex(null)
    setOverIndex(null)
  }, [])

  return { dragIndex, overIndex, onDragStart, onDragOver, onDrop, onDragEnd }
}
