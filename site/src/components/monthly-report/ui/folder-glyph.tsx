import { cn } from '@/lib/utils'

interface FolderGlyphProps {
  className?: string
}

/** Solid paths, not lucide's stroke `Folder`, which leaves a double edge when filled. */
export function FolderGlyph({ className }: FolderGlyphProps) {
  return (
    <svg
      viewBox="0 0 48 40"
      aria-hidden="true"
      focusable="false"
      className={cn('h-10 w-12 shrink-0', className)}
    >
      <path
        d="M3 9a4 4 0 0 1 4-4h11.2c1.1 0 2.1.4 2.9 1.2l2.6 2.6c.4.4.9.6 1.4.6H41a4 4 0 0 1 4 4v5H3V9Z"
        fill="#F0A32C"
      />
      <path
        d="M3 16a4 4 0 0 1 4-4h34a4 4 0 0 1 4 4v15a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V16Z"
        fill="#FDC53F"
      />
    </svg>
  )
}
