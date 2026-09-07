import {
  AlignCenterHorizontal,
  AlignVerticalSpaceAround,
  RotateCcw,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CERTIFICATE_ACCENT_STYLES } from '../../constants/certificate-design'
import { CERTIFICATE_FRAME_PRESETS } from '../../constants/certificate-frames'
import {
  CERTIFICATE_ELEMENT_LABELS,
  CERTIFICATE_ELEMENT_ORDER,
  DEFAULT_CERTIFICATE_LAYOUT,
  NUDGE_STEP,
  NUDGE_STEP_LARGE,
  centerHorizontally,
  clampPosition,
  distributeVertically,
  isElementVisible,
  snapToGuides,
} from '../../constants/certificate-layout'
import {
  bringToFront,
  clampImageSize,
  sendToBack,
} from '../../constants/certificate-images'
import { DEFAULT_CERTIFICATE_FONT } from '../../constants/certificate-fonts'
import {
  clampElementHeight,
  clampElementWidth,
  elementAlign,
  elementFontSize,
  elementHeight,
  elementWidth,
} from '../../constants/certificate-typography'
import type {
  CertificateDesign,
  CertificateElementId,
  CertificateFontId,
  CertificateTextAlign,
  CertificateImage,
  CertificateImageShape,
  CertificateLayout,
  CertificateOrientation,
} from '../../types/certificate-template'
import { CertificateAlignField } from './ui/certificate-align-field'
import { CertificateBlockContent } from './ui/certificate-block-content'
import { CertificateFontPicker } from './ui/certificate-font-picker'
import { CertificateFontSizeField } from './ui/certificate-font-size-field'
import { CertificateImageBox, type ResizeHandle } from './ui/certificate-image-box'
import { CertificateFrameOrnament } from './ui/certificate-frame-ornament'
import { CertificateRuler } from './ui/certificate-ruler'

/**
 * Where a block can be grabbed. Corners carry both axes, so one drag resizes the box
 * as a whole and the text inside follows it down.
 */
const BLOCK_HANDLES = [
  {
    id: 'nw',
    className: '-top-1 -left-1 h-2.5 w-2.5 cursor-nwse-resize',
    dx: -1,
    dy: -1,
  },
  {
    id: 'ne',
    className: '-top-1 -right-1 h-2.5 w-2.5 cursor-nesw-resize',
    dx: 1,
    dy: -1,
  },
  {
    id: 'se',
    className: '-right-1 -bottom-1 h-2.5 w-2.5 cursor-nwse-resize',
    dx: 1,
    dy: 1,
  },
  {
    id: 'sw',
    className: '-bottom-1 -left-1 h-2.5 w-2.5 cursor-nesw-resize',
    dx: -1,
    dy: 1,
  },
  {
    id: 'n',
    className: '-top-1 left-1/2 h-2 w-6 -translate-x-1/2 cursor-ns-resize',
    dx: 0,
    dy: -1,
  },
  {
    id: 's',
    className: '-bottom-1 left-1/2 h-2 w-6 -translate-x-1/2 cursor-ns-resize',
    dx: 0,
    dy: 1,
  },
  {
    id: 'w',
    className: '-left-1 top-1/2 h-6 w-2 -translate-y-1/2 cursor-ew-resize',
    dx: -1,
    dy: 0,
  },
  {
    id: 'e',
    className: '-right-1 top-1/2 h-6 w-2 -translate-y-1/2 cursor-ew-resize',
    dx: 1,
    dy: 0,
  },
] as const

type BlockHandle = (typeof BLOCK_HANDLES)[number]

interface CertificateLayoutEditorProps {
  design: CertificateDesign
  orientation: CertificateOrientation
  title: string
  onLayoutChange: (layout: CertificateLayout) => void
  onImagesChange: (images: CertificateImage[]) => void
  /** Sets the sheet font when no block is selected, that block's font otherwise. */
  onFontChange: (target: CertificateElementId | null, font: CertificateFontId) => void
  /** Text size, in points, of one block. */
  onSizeChange: (target: CertificateElementId, size: number) => void
  /** Width of one block, as a percentage of the sheet. */
  onWidthChange: (target: CertificateElementId, width: number) => void
  /** Where one block's text sits inside its box. */
  onAlignChange: (target: CertificateElementId, align: CertificateTextAlign) => void
  /** Height of one block, as a percentage of the sheet. */
  onHeightChange: (target: CertificateElementId, height: number) => void
}

/**
 * The certificate as a working surface: every block is dragged into place against
 * rulers on all four edges, snaps to the sheet centre and to the other blocks' axes,
 * and can be squared up in one press. Positions are percentages of the sheet, so a
 * layout holds however large the certificate is finally printed.
 */
export function CertificateLayoutEditor({
  design,
  orientation,
  title,
  onLayoutChange,
  onImagesChange,
  onFontChange,
  onSizeChange,
  onWidthChange,
  onAlignChange,
  onHeightChange,
}: CertificateLayoutEditorProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<CertificateElementId | null>(null)
  const [dragging, setDragging] = useState<CertificateElementId | null>(null)
  const [resizing, setResizing] = useState<CertificateElementId | null>(null)
  const [hovered, setHovered] = useState<CertificateElementId | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [guides, setGuides] = useState<{ x: boolean; y: boolean }>({
    x: false,
    y: false,
  })

  const accent = CERTIFICATE_ACCENT_STYLES[design.accent]
  const preset = CERTIFICATE_FRAME_PRESETS[design.frame]
  const portrait = orientation === 'portrait'
  const uploaded = Boolean(design.frameSvgUrl)

  const visible = CERTIFICATE_ELEMENT_ORDER.filter((id) => isElementVisible(id, design))
  const active = dragging ?? selected
  const marker = active ? design.layout[active] : undefined

  const move = (id: CertificateElementId, x: number, y: number) => {
    // The other blocks' axes are guides too, so a caption can be squared to the seal.
    const others = visible.filter((one) => one !== id)
    const snappedX = snapToGuides(x, [50, ...others.map((one) => design.layout[one].x)])
    const snappedY = snapToGuides(y, [50, ...others.map((one) => design.layout[one].y)])

    setGuides({ x: snappedX === 50, y: snappedY === 50 })
    onLayoutChange({
      ...design.layout,
      [id]: { x: clampPosition(snappedX), y: clampPosition(snappedY) },
    })
  }

  const startDrag = (id: CertificateElementId) => (event: React.PointerEvent) => {
    if (event.button !== 0) return
    event.preventDefault()

    const sheet = sheetRef.current?.getBoundingClientRect()
    if (!sheet) return

    const origin = { ...design.layout[id] }
    const startX = event.clientX
    const startY = event.clientY

    setSelected(id)
    setDragging(id)

    const onMove = (moveEvent: PointerEvent) => {
      move(
        id,
        origin.x + ((moveEvent.clientX - startX) / sheet.width) * 100,
        origin.y + ((moveEvent.clientY - startY) / sheet.height) * 100,
      )
    }

    const onUp = () => {
      setDragging(null)
      setGuides({ x: false, y: false })
      window.removeEventListener('pointermove', onMove)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
  }

  const patchImage = (id: string, patch: Partial<CertificateImage>) =>
    onImagesChange(
      design.images.map((one) => (one.id === id ? { ...one, ...patch } : one)),
    )

  const startImageDrag = (image: CertificateImage) => (event: React.PointerEvent) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()

    const sheet = sheetRef.current?.getBoundingClientRect()
    if (!sheet) return

    const origin = { x: image.x, y: image.y }
    const startX = event.clientX
    const startY = event.clientY

    setSelected(null)
    setSelectedImage(image.id)

    const onMove = (moveEvent: PointerEvent) => {
      patchImage(image.id, {
        x: clampPosition(origin.x + ((moveEvent.clientX - startX) / sheet.width) * 100),
        y: clampPosition(
          origin.y + ((moveEvent.clientY - startY) / sheet.height) * 100,
        ),
      })
    }

    const onUp = () => window.removeEventListener('pointermove', onMove)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
  }

  /**
   * Dragging a grip outward grows the image and inward shrinks it, with the opposite
   * edge held still — so the corner under the pointer is the one that moves.
   */
  const startImageResize =
    (image: CertificateImage) =>
    (handle: ResizeHandle) =>
    (event: React.PointerEvent) => {
      if (event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()

      const sheet = sheetRef.current?.getBoundingClientRect()
      if (!sheet) return

      const origin = { ...image }
      const startX = event.clientX
      const startY = event.clientY

      setSelectedImage(image.id)

      const onMove = (moveEvent: PointerEvent) => {
        const deltaX = ((moveEvent.clientX - startX) / sheet.width) * 100
        const deltaY = ((moveEvent.clientY - startY) / sheet.height) * 100

        const width = handle.dx
          ? clampImageSize(origin.width + deltaX * handle.dx)
          : origin.width
        const height = handle.dy
          ? clampImageSize(origin.height + deltaY * handle.dy)
          : origin.height

        patchImage(image.id, {
          width,
          height,
          // The centre shifts by half of what the dragged edge moved, which keeps the
          // opposite edge pinned where it was.
          x: clampPosition(origin.x + (handle.dx * (width - origin.width)) / 2),
          y: clampPosition(origin.y + (handle.dy * (height - origin.height)) / 2),
        })
      }

      const onUp = () => window.removeEventListener('pointermove', onMove)
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp, { once: true })
    }

  /**
   * One drag for every grip: a corner changes width and height together, an edge only
   * its own dimension. The box grows and shrinks around its own centre, so the grip
   * under the pointer keeps up while the block stays on the axis it was placed on.
   *
   * A block is as tall as its text until a grip is dragged, so the first drag starts
   * from whatever it measures right now rather than jumping to a guess.
   */
  const startBoxResize =
    (id: CertificateElementId, handle: BlockHandle) => (event: React.PointerEvent) => {
      if (event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()

      const sheet = sheetRef.current?.getBoundingClientRect()
      const block = event.currentTarget.parentElement
      if (!sheet || !block) return

      const startWidth = elementWidth(design, id)
      const startHeight =
        elementHeight(design, id) ?? (block.offsetHeight / sheet.height) * 100
      const startX = event.clientX
      const startY = event.clientY

      setSelected(id)
      setResizing(id)

      const onMove = (moveEvent: PointerEvent) => {
        if (handle.dx) {
          const delta = ((moveEvent.clientX - startX) / sheet.width) * 100
          onWidthChange(id, clampElementWidth(startWidth + delta * handle.dx * 2))
        }
        if (handle.dy) {
          const delta = ((moveEvent.clientY - startY) / sheet.height) * 100
          onHeightChange(id, clampElementHeight(startHeight + delta * handle.dy * 2))
        }
      }

      const onUp = () => {
        setResizing(null)
        window.removeEventListener('pointermove', onMove)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp, { once: true })
    }

  // Arrow keys nudge the selected block, so a layout can be finished without a mouse.
  const onKeyDown = (id: CertificateElementId) => (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP
    const position = design.layout[id]

    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const delta = deltas[event.key]
    if (!delta) return

    event.preventDefault()
    onLayoutChange({
      ...design.layout,
      [id]: {
        x: clampPosition(position.x + delta[0]),
        y: clampPosition(position.y + delta[1]),
      },
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] tracking-wider text-gray-500 uppercase">
          Layout editor
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* The picker follows the selection: pick a block to change just its face,
              deselect to change the whole sheet. */}
          <CertificateFontPicker
            target={selected}
            value={
              selected
                ? (design.elementFonts?.[selected] ?? DEFAULT_CERTIFICATE_FONT)
                : (design.font ?? DEFAULT_CERTIFICATE_FONT)
            }
            onChange={(font) => onFontChange(selected, font)}
          />
          {/* Sizing needs a block; with none picked the field says so by being off. */}
          <CertificateFontSizeField
            value={elementFontSize(design, selected ?? 'body')}
            disabled={!selected}
            onChange={(size) => selected && onSizeChange(selected, size)}
          />
          <CertificateAlignField
            value={elementAlign(design, selected ?? 'body')}
            disabled={!selected}
            onChange={(align) => selected && onAlignChange(selected, align)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onLayoutChange(centerHorizontally(design.layout, visible))}
          >
            <AlignCenterHorizontal className="h-3.5 w-3.5" />
            Center
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onLayoutChange(distributeVertically(design.layout, visible))}
          >
            <AlignVerticalSpaceAround className="h-3.5 w-3.5" />
            Space evenly
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onLayoutChange({ ...DEFAULT_CERTIFICATE_LAYOUT })}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>

      {/* Rulers frame the sheet on all four edges and share its exact width and height:
          the sheet is sized off the space actually available, so the whole certificate
          stays in view instead of running past the pane. */}
      <div className="flex min-h-0 flex-1 justify-center">
        <div className="grid h-full grid-cols-[1.25rem_auto_1.25rem] grid-rows-[1.25rem_minmax(0,1fr)_1.25rem]">
          <span />
          <CertificateRuler orientation="horizontal" marker={marker?.x} />
          <span />

          <CertificateRuler orientation="vertical" marker={marker?.y} />

          <div
            ref={sheetRef}
            className={cn(
              'relative @container h-full w-auto max-w-full overflow-hidden bg-white bg-contain bg-center bg-no-repeat text-center shadow-sm',
              !uploaded && preset.sheet,
              !uploaded && accent.frame,
              portrait ? 'aspect-[3/4]' : 'aspect-[4/3]',
            )}
            style={
              uploaded ? { backgroundImage: `url(${design.frameSvgUrl})` } : undefined
            }
          >
            {!uploaded && (
              <CertificateFrameOrnament frame={design.frame} accent={design.accent} />
            )}

            {guides.x && (
              <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-[var(--cares-primary)]" />
            )}
            {guides.y && (
              <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[var(--cares-primary)]" />
            )}

            {design.images.map((image) => (
              <CertificateImageBox
                key={image.id}
                image={image}
                selected={selectedImage === image.id}
                onSelect={() => setSelectedImage(image.id)}
                onDragStart={startImageDrag(image)}
                onResizeStart={startImageResize(image)}
                onShape={(shape: CertificateImageShape) =>
                  patchImage(image.id, { shape })
                }
                onBringToFront={() =>
                  onImagesChange(bringToFront(design.images, image.id))
                }
                onSendToBack={() => onImagesChange(sendToBack(design.images, image.id))}
                onRemove={() =>
                  onImagesChange(design.images.filter((one) => one.id !== image.id))
                }
              />
            ))}

            {visible.map((id) => {
              const position = design.layout[id]
              const height = elementHeight(design, id)
              const isSelected = selected === id

              return (
                <div
                  key={id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${CERTIFICATE_ELEMENT_LABELS[id]} — drag to position`}
                  aria-pressed={isSelected}
                  onPointerDown={(event) => {
                    setSelectedImage(null)
                    startDrag(id)(event)
                  }}
                  onKeyDown={onKeyDown(id)}
                  onFocus={() => setSelected(id)}
                  onPointerEnter={() => setHovered(id)}
                  onPointerLeave={() => setHovered((one) => (one === id ? null : one))}
                  className={cn(
                    'absolute -translate-x-1/2 -translate-y-1/2 cursor-move rounded-md p-1 outline-none',
                    (dragging === id || resizing === id) && 'opacity-90',
                    isSelected
                      ? 'ring-2 ring-[var(--cares-primary)]'
                      : 'hover:ring-1 hover:ring-gray-300',
                  )}
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    // The seal draws itself at its own diameter.
                    width: id === 'seal' ? 'auto' : `${elementWidth(design, id)}%`,
                    height: height === undefined ? 'auto' : `${height}%`,
                  }}
                >
                  {isSelected && (
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-gray-900 px-1.5 py-0.5 text-[10px] whitespace-nowrap text-white tabular-nums">
                      {CERTIFICATE_ELEMENT_LABELS[id]} · {position.x.toFixed(0)}%,{' '}
                      {position.y.toFixed(0)}%
                    </span>
                  )}
                  <CertificateBlockContent
                    id={id}
                    design={design}
                    title={title}
                    fixedHeight={height !== undefined}
                  />

                  {/* Corner grips resize both dimensions at once, edge grips just
                      their own. They surface on hover as well as on the selected
                      block, so an edge is grabbable the moment the pointer reaches
                      it. */}
                  {(isSelected || hovered === id || resizing === id) &&
                    BLOCK_HANDLES.map((handle) => (
                      <span
                        key={handle.id}
                        role="presentation"
                        onPointerDown={startBoxResize(id, handle)}
                        className={cn(
                          'absolute rounded-full border border-white bg-[var(--cares-primary)]',
                          handle.className,
                        )}
                      />
                    ))}
                </div>
              )
            })}
          </div>

          <CertificateRuler orientation="vertical" marker={marker?.y} />

          <span />
          <CertificateRuler orientation="horizontal" marker={marker?.x} />
          <span />
        </div>
      </div>
    </div>
  )
}
