import { cn } from '@/lib/utils'

interface FolderGlyphProps {
  className?: string
}

/**
 * The library's folder, drawn as flat shapes rather than a filled outline icon —
 * lucide's `Folder` is a stroke glyph, and filling it leaves a soft double edge at
 * the size a folder tile needs. Two solid paths stay crisp at any scale.
 */
export function FolderGlyph({ className }: FolderGlyphProps) {
  return (
    <svg
      viewBox="0 0 48 40"
      aria-hidden="true"
      focusable="false"
      className={cn('h-10 w-12 shrink-0', className)}
    >
      {/* Back sheet with the tab, a shade deeper so the fold reads at small sizes. */}
      <path
        d="M3 9a4 4 0 0 1 4-4h11.2c1.1 0 2.1.4 2.9 1.2l2.6 2.6c.4.4.9.6 1.4.6H41a4 4 0 0 1 4 4v5H3V9Z"
        fill="#F0A32C"
      />
      {/* Front pocket. */}
      <path
        d="M3 16a4 4 0 0 1 4-4h34a4 4 0 0 1 4 4v15a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V16Z"
        fill="#FDC53F"
      />
    </svg>
  )
}
