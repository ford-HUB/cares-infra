import { useState } from 'react'
import { FolderPlus, PencilLine, X } from 'lucide-react'

interface FolderNameModalProps {
  mode: 'create' | 'rename'
  /** Current name when renaming; the field starts empty on a new folder. */
  initialName?: string
  saving: boolean
  onClose: () => void
  onSubmit: (name: string) => void
}

/** The director names their own folders, so this asks for one thing and nothing else. */
export function FolderNameModal({
  mode,
  initialName = '',
  saving,
  onClose,
  onSubmit,
}: FolderNameModalProps) {
  const [name, setName] = useState(initialName)
  const renaming = mode === 'rename'
  const invalid = name.trim().length === 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={renaming ? 'Rename folder' : 'New folder'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!invalid && !saving) onSubmit(name)
        }}
        className="w-full max-w-sm rounded-xl bg-white shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
              {renaming ? (
                <PencilLine className="h-4 w-4" />
              ) : (
                <FolderPlus className="h-4 w-4" />
              )}
            </span>
            <h3 className="truncate text-[15px] font-semibold text-gray-900">
              {renaming ? 'Rename folder' : 'New folder'}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <label
            htmlFor="folder-name"
            className="text-[11px] tracking-wider text-gray-500 uppercase"
          >
            Folder name
          </label>
          <input
            id="folder-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Accreditation Packet 2026"
            className="mt-1.5 h-9 w-full rounded-lg border border-gray-200 px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
          />
          <p className="mt-2 text-[12px] text-gray-500">
            Folders hold approved reports from any department. Filing one here does not
            change which college it counts for.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-gray-200 px-3 text-[13px] text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={invalid || saving}
            className="h-9 rounded-lg bg-[var(--cares-primary)] px-3 text-[13px] font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {renaming ? 'Save name' : 'Create folder'}
          </button>
        </div>
      </form>
    </div>
  )
}
