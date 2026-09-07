import { MoreVertical, PencilLine, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { LibraryFolder } from '../../../types/monthly-report'
import { FolderGlyph } from './folder-glyph'

interface ReportFolderTileProps {
  folder: LibraryFolder
  onOpen: (folder: LibraryFolder) => void
  onRename: (folder: LibraryFolder) => void
  onDelete: (folder: LibraryFolder) => void
}

/**
 * A shelf in the library, drawn the way a folder is drawn everywhere else: the folder
 * itself, its name underneath. Only a folder the director made can be renamed or
 * removed — the college folders are filled by the approval itself.
 */
export function ReportFolderTile({
  folder,
  onOpen,
  onRename,
  onDelete,
}: ReportFolderTileProps) {
  const custom = folder.kind === 'custom'

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onOpen(folder)}
        title={folder.name}
        className="flex w-full flex-col items-center gap-2 rounded-xl px-2 py-3 transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
      >
        <FolderGlyph />

        <span className="w-full min-w-0">
          <span className="line-clamp-2 text-center text-[12px] leading-snug font-medium text-gray-800">
            {folder.name}
          </span>
          <span className="mt-0.5 block text-center text-[11px] text-gray-400 tabular-nums">
            {folder.reports.length} report{folder.reports.length === 1 ? '' : 's'}
          </span>
        </span>
      </button>

      {custom && (
        <div className="absolute top-1.5 right-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Manage ${folder.name}`}
                className="rounded-md bg-white/80 p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => onRename(folder)}>
                <PencilLine className="h-3.5 w-3.5" />
                Rename folder
              </DropdownMenuItem>
              {/* Deleting only empties the shelf — the reports fall back to their
                  college folder, so nothing filed is ever lost with it. */}
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(folder)}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}
