import { Ban, KeyRound, MoreVertical, RotateCcw, ShieldOff, UserPen } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ManagedUser } from '../../../types/manage-users'

interface UserActionsMenuProps {
  user: ManagedUser
  onView: (user: ManagedUser) => void
  onRestrict: (user: ManagedUser) => void
  onUnrestrict: (user: ManagedUser) => void
  onBlockIp: (user: ManagedUser) => void
  onUnblockIp: (user: ManagedUser) => void
  /** Undefined for a caller who cannot issue credentials — the item is then hidden. */
  onReissueCredentials?: (user: ManagedUser) => void
}

const MENU_WIDTH_PX = 184
const MENU_GAP_PX = 4

/**
 * Row-level actions. The menu is rendered fixed-positioned against the trigger's rect
 * so the table's scroll container can't clip it.
 */
export function UserActionsMenu({
  user,
  onView,
  onRestrict,
  onUnrestrict,
  onBlockIp,
  onUnblockIp,
  onReissueCredentials,
}: UserActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPosition({
      top: rect.bottom + MENU_GAP_PX,
      left: Math.max(MENU_GAP_PX, rect.right - MENU_WIDTH_PX),
    })
  }, [open])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const close = () => setOpen(false)

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', close)
    // Capture phase so a scroll in any ancestor container dismisses the menu.
    window.addEventListener('scroll', close, true)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  const run = (action: (user: ManagedUser) => void) => () => {
    setOpen(false)
    action(user)
  }

  const itemClass =
    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-gray-700 hover:bg-gray-50'

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Actions for ${user.firstName} ${user.lastName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        className={`rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 ${
          open ? 'bg-gray-100 text-gray-700' : ''
        }`}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: position.top, left: position.left, width: MENU_WIDTH_PX }}
          className="fixed z-50 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" role="menuitem" className={itemClass} onClick={run(onView)}>
            <UserPen className="h-4 w-4 text-gray-400" />
            View details
          </button>

          {user.status === 'restricted' ? (
            <button
              type="button"
              role="menuitem"
              className={`${itemClass} text-[var(--cares-primary)] hover:bg-green-50`}
              onClick={run(onUnrestrict)}
            >
              <RotateCcw className="h-4 w-4" />
              Lift restriction
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              className={`${itemClass} text-red-600 hover:bg-red-50`}
              onClick={run(onRestrict)}
            >
              <ShieldOff className="h-4 w-4" />
              Restrict
            </button>
          )}

          {onReissueCredentials && (
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={run(onReissueCredentials)}
            >
              <KeyRound className="h-4 w-4 text-gray-400" />
              Re-issue password
            </button>
          )}

          {user.blockedIps.length > 0 ? (
            <button
              type="button"
              role="menuitem"
              className={`${itemClass} text-[var(--cares-primary)] hover:bg-green-50`}
              onClick={run(onUnblockIp)}
            >
              <RotateCcw className="h-4 w-4" />
              Unblock IP
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              className={`${itemClass} text-red-600 hover:bg-red-50`}
              onClick={run(onBlockIp)}
            >
              <Ban className="h-4 w-4" />
              Block IP
            </button>
          )}
        </div>
      )}
    </>
  )
}
