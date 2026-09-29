import { ArrowDownToLine, ArrowUpToLine, Trash2 } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import {
  IMAGE_SHAPE_CLASSES,
  IMAGE_SHAPE_LABELS,
  IMAGE_SHAPE_ORDER,
} from '../../../constants/certificate-images'
import type {
  CertificateImage,
  CertificateImageShape,
} from '../../../types/certificate-template'

/** Corner and edge grips; each says which dimensions it changes and how. */
const HANDLES = [
  { id: 'nw', className: '-top-1 -left-1 cursor-nwse-resize', dx: -1, dy: -1 },
  {
    id: 'n',
    className: '-top-1 left-1/2 -translate-x-1/2 cursor-ns-resize',
    dx: 0,
    dy: -1,
  },
  { id: 'ne', className: '-top-1 -right-1 cursor-nesw-resize', dx: 1, dy: -1 },
  {
    id: 'e',
    className: 'top-1/2 -right-1 -translate-y-1/2 cursor-ew-resize',
    dx: 1,
    dy: 0,
  },
  { id: 'se', className: '-right-1 -bottom-1 cursor-nwse-resize', dx: 1, dy: 1 },
  {
    id: 's',
    className: '-bottom-1 left-1/2 -translate-x-1/2 cursor-ns-resize',
    dx: 0,
    dy: 1,
  },
  { id: 'sw', className: '-bottom-1 -left-1 cursor-nesw-resize', dx: -1, dy: 1 },
  {
    id: 'w',
    className: 'top-1/2 -left-1 -translate-y-1/2 cursor-ew-resize',
    dx: -1,
    dy: 0,
  },
] as const

export type ResizeHandle = (typeof HANDLES)[number]

interface CertificateImageBoxProps {
  image: CertificateImage
  selected: boolean
  onSelect: () => void
  onDragStart: (event: React.PointerEvent) => void
  onResizeStart: (handle: ResizeHandle) => (event: React.PointerEvent) => void
  onShape: (shape: CertificateImageShape) => void
  onBringToFront: () => void
  onSendToBack: () => void
  onRemove: () => void
}

/**
 * One placed image on the editing surface: dragged from the middle, resized from any
 * edge or corner, and right-clicked for its shape and stacking. Grips only appear once
 * it is selected, so an unselected sheet still reads as the finished certificate.
 */
export function CertificateImageBox({
  image,
  selected,
  onSelect,
  onDragStart,
  onResizeStart,
  onShape,
  onBringToFront,
  onSendToBack,
  onRemove,
}: CertificateImageBoxProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          aria-label={`${image.name} — drag to move, right-click for options`}
          aria-pressed={selected}
          onPointerDown={onDragStart}
          onFocus={onSelect}
          className={cn(
            'absolute -translate-x-1/2 -translate-y-1/2 cursor-move outline-none',
            selected && 'ring-2 ring-[var(--cares-primary)]',
            IMAGE_SHAPE_CLASSES[image.shape],
          )}
          style={{
            left: `${image.x}%`,
            top: `${image.y}%`,
            width: `${image.width}%`,
            height: `${image.height}%`,
            zIndex: image.z,
          }}
        >
          <img
            src={image.url}
            alt=""
            draggable={false}
            className={cn(
              'pointer-events-none h-full w-full object-cover',
              IMAGE_SHAPE_CLASSES[image.shape],
            )}
          />

          {selected && (
            <>
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-gray-900 px-1.5 py-0.5 text-[10px] whitespace-nowrap text-white tabular-nums">
                {image.name} · {image.width.toFixed(0)}×{image.height.toFixed(0)}%
              </span>
              {HANDLES.map((handle) => (
                <span
                  key={handle.id}
                  onPointerDown={onResizeStart(handle)}
                  className={cn(
                    'absolute h-2.5 w-2.5 rounded-full border border-white bg-[var(--cares-primary)]',
                    handle.className,
                  )}
                />
              ))}
            </>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        <ContextMenuLabel className="text-[11px] tracking-wider text-gray-500 uppercase">
          Reshape
        </ContextMenuLabel>
        {/* The four shapes sit inline rather than behind a submenu — picking a shape is
            the whole reason this menu is open. */}
        <div className="flex items-center gap-1 px-1.5 pb-1.5">
          {IMAGE_SHAPE_ORDER.map((shape) => (
            <button
              key={shape}
              type="button"
              title={IMAGE_SHAPE_LABELS[shape]}
              aria-label={IMAGE_SHAPE_LABELS[shape]}
              aria-pressed={image.shape === shape}
              onClick={() => onShape(shape)}
              className={cn(
                'flex h-9 flex-1 items-center justify-center rounded-md border transition-colors',
                image.shape === shape
                  ? 'border-[var(--cares-primary)] bg-gray-50'
                  : 'border-gray-200 hover:bg-gray-50',
              )}
            >
              <span
                className={cn(
                  'h-4 w-4 bg-gray-400',
                  shape === 'rounded' && 'rounded',
                  shape === 'circle' && 'rounded-full',
                  shape === 'triangle' && '[clip-path:polygon(50%_0,100%_100%,0_100%)]',
                )}
              />
            </button>
          ))}
        </div>

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={onBringToFront}>
          <ArrowUpToLine className="h-3.5 w-3.5" />
          Bring to front
        </ContextMenuItem>
        <ContextMenuItem onSelect={onSendToBack}>
          <ArrowDownToLine className="h-3.5 w-3.5" />
          Send behind text
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
          Remove image
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
