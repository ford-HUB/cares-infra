import { Ban, Edit2, Eye, Trash2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { EventTableRow } from '../../../types/event'

interface EventActionsMenuProps {
  event: EventTableRow
  /** Rect of the row trigger the menu is anchored to. */
  anchor: DOMRect
  onClose: () => void
  onView: (event: EventTableRow) => void
  onEdit: (event: EventTableRow) => void
  onCancel: (event: EventTableRow) => void
  onDelete: (event: EventTableRow) => void
}

const MENU_WIDTH_PX = 200
const MENU_GAP_PX = 6
/** Rough menu height used only to decide whether to open upward. */
const MENU_ESTIMATED_HEIGHT_PX = 180

/**
 * Row-level actions for an event. Rendered fixed-positioned against the trigger's rect so
 * the table's scroll container can't clip it, and flipped above the trigger when there is
 * no room below. Items are labelled — the previous icon-only strip gave no hint of what
 * each button did, and "Cancel event" reads as destructive enough to need words.
 */
export function EventActionsMenu({
  event,
  anchor,
  onClose,
  onView,
  onEdit,
  onCancel,
  onDelete,
}: EventActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    const height = menuRef.current?.offsetHeight ?? MENU_ESTIMATED_HEIGHT_PX
    const openUpward =
      anchor.bottom + MENU_GAP_PX + height > window.innerHeight && anchor.top > height

    setPosition({
      top: openUpward
        ? Math.max(MENU_GAP_PX, anchor.top - MENU_GAP_PX - height)
        : anchor.bottom + MENU_GAP_PX,
      left: Math.min(
        Math.max(MENU_GAP_PX, anchor.right - MENU_WIDTH_PX),
        window.innerWidth - MENU_WIDTH_PX - MENU_GAP_PX,
      ),
    })
  }, [anchor])

  // Focus the first item so the menu is usable from the keyboard right away.
  useEffect(() => {
    if (!position) return
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
  }, [position])

  useEffect(() => {
    const onPointerDown = (pointerEvent: MouseEvent) => {
      const target = pointerEvent.target as HTMLElement
      if (menuRef.current?.contains(target)) return
      // The row trigger toggles the menu itself; closing here first would reopen it.
      if (target.closest('[data-event-actions-trigger]')) return
      onClose()
    }
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('resize', onClose)
    // Capture phase so a scroll in any ancestor container dismisses the menu.
    window.addEventListener('scroll', onClose, true)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  const onKeyDown = (keyEvent: React.KeyboardEvent<HTMLDivElement>) => {
    if (keyEvent.key === 'Escape') {
      keyEvent.stopPropagation()
      onClose()
      return
    }
    if (keyEvent.key !== 'ArrowDown' && keyEvent.key !== 'ArrowUp') return

    keyEvent.preventDefault()
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    )
    if (items.length === 0) return
    const current = items.indexOf(document.activeElement as HTMLButtonElement)
    const step = keyEvent.key === 'ArrowDown' ? 1 : -1
    items[(current + step + items.length) % items.length].focus()
  }

  const run = (action: (event: EventTableRow) => void) => () => {
    onClose()
    action(event)
  }

  const itemClass =
    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-gray-700 outline-none hover:bg-gray-50 focus-visible:bg-gray-50'

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Actions for ${event.title}`}
      onKeyDown={onKeyDown}
      onClick={(clickEvent) => clickEvent.stopPropagation()}
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        width: MENU_WIDTH_PX,
        visibility: position ? 'visible' : 'hidden',
      }}
      className="fixed z-50 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
    >
      <p className="truncate px-3 pt-1 pb-1.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
        {event.title}
      </p>

      <button type="button" role="menuitem" className={itemClass} onClick={run(onView)}>
        <Eye className="h-4 w-4 text-gray-400" />
        View details
      </button>

      <button type="button" role="menuitem" className={itemClass} onClick={run(onEdit)}>
        <Edit2 className="h-4 w-4 text-gray-400" />
        Edit event
      </button>

      {event.status !== 'Cancelled' && (
        <button
          type="button"
          role="menuitem"
          className={`${itemClass} text-amber-700 hover:bg-amber-50 focus-visible:bg-amber-50`}
          onClick={run(onCancel)}
        >
          <Ban className="h-4 w-4" />
          Cancel event
        </button>
      )}

      <div className="my-1 border-t border-gray-100" />

      <button
        type="button"
        role="menuitem"
        className={`${itemClass} text-red-600 hover:bg-red-50 focus-visible:bg-red-50`}
        onClick={run(onDelete)}
      >
        <Trash2 className="h-4 w-4" />
        Delete event
      </button>
    </div>
  )
}
