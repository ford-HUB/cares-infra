import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Width cap for the card, e.g. `max-w-sm`. */
  className?: string
  /** Changing it remounts the card, so a swap between forms springs in again. */
  contentKey?: string
  /** Keeps a half-filled form open when the visitor clicks the backdrop by accident. */
  preventOutsideClose?: boolean
}

/** Heading of an auth modal; names the dialog for screen readers. */
export function AuthModalTitle(props: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title {...props} />
}

/**
 * A frosted-glass card floating over the page behind a lightly blurred, 20%-dimmed
 * backdrop. Radix locks the page scroll and traps focus while it is open; the card
 * bounces in and out. Centring uses the `translate` property, so the keyframes'
 * `transform` does not fight it.
 *
 * The card sits one layer above the backdrop (z-51 over z-50) rather than relying on DOM
 * order: Radix portals the overlay and the card separately, and when `contentKey` differs
 * from the last form shown (e.g. opening request-access after the closed modal last held
 * sign-in), the card's portal mounts first and the overlay lands after it in <body>. At
 * equal z-index the overlay then paints over the card, blurring and dimming the form.
 */
export function AuthModal({
  open,
  onClose,
  children,
  className,
  contentKey,
  preventOutsideClose = false,
}: AuthModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] data-[state=closed]:animate-auth-backdrop-out data-[state=open]:animate-auth-backdrop-in motion-reduce:animate-none" />
        <DialogPrimitive.Content
          key={contentKey}
          aria-describedby={undefined}
          onInteractOutside={preventOutsideClose ? (event) => event.preventDefault() : undefined}
          className={cn(
            'fixed top-1/2 left-1/2 z-[51] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/60 bg-white/70 shadow-2xl ring-1 ring-black/5 outline-none backdrop-blur-xl backdrop-saturate-150',
            'data-[state=closed]:animate-auth-modal-out data-[state=open]:animate-auth-modal-in motion-reduce:animate-none',
            className,
          )}
        >
          {children}
          <DialogPrimitive.Close
            className="absolute top-3 right-3 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-[var(--cares-heading)] focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
