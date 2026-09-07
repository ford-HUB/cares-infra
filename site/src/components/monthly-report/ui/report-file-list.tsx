import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, FolderInput, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { formatFileSize } from '../../../constants/formatting'
import {
  DOCUMENT_KIND_LABELS,
  formatReportPeriodShort,
} from '../../../constants/monthly-report'
import type {
  MonthlyReport,
  ReportDocument,
  ReportFolder,
} from '../../../types/monthly-report'
import { DepartmentChip } from './department-chip'
import { DocumentKindIcon } from './document-kind-icon'

/** One row is one uploaded file, with the report it was filed under kept alongside. */
interface FileRow {
  document: ReportDocument
  report: MonthlyReport
}

type SortKey = 'name' | 'modified' | 'type' | 'size'

interface ReportFileListProps {
  reports: MonthlyReport[]
  folders: ReportFolder[]
  /** Folder assignment per report id; absent while a report sits under its college. */
  folderOf: Map<string, string>
  onOpenDocument: (report: MonthlyReport, documentId: string) => void
  onMove: (report: MonthlyReport, folderId: string | null) => void
}

const COLUMNS: { key: SortKey; label: string; className: string }[] = [
  { key: 'name', label: 'Name', className: 'flex-1 min-w-0' },
  { key: 'modified', label: 'Date modified', className: 'w-44 shrink-0' },
  { key: 'type', label: 'Type', className: 'w-40 shrink-0' },
  { key: 'size', label: 'Size', className: 'w-24 shrink-0 justify-end' },
]

/** `5/24/2026 9:34 PM` — the file-manager reading of a timestamp, not a prose date. */
function formatFileTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return `${date.toLocaleDateString('en-US')} ${date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

/** `DOCX File` / `PDF File`, so the column reads like a file type and not a label. */
function fileTypeLabel(document: ReportDocument): string {
  return document.kind === 'image'
    ? DOCUMENT_KIND_LABELS.image
    : `${document.kind.toUpperCase()} File`
}

function compare(a: FileRow, b: FileRow, key: SortKey): number {
  switch (key) {
    case 'name':
      return a.document.name.localeCompare(b.document.name)
    case 'modified':
      return (
        new Date(a.document.uploadedAt).getTime() -
        new Date(b.document.uploadedAt).getTime()
      )
    case 'type':
      return (
        a.document.kind.localeCompare(b.document.kind) ||
        a.document.name.localeCompare(b.document.name)
      )
    case 'size':
      return a.document.sizeBytes - b.document.sizeBytes
  }
}

/**
 * A folder's contents drawn the way a file manager draws them: every uploaded file
 * on its own row, sorted by a column the director picks. The report a file belongs
 * to rides in the name column, because filing still happens per report — the ⋮ moves
 * the whole report, files and all.
 */
export function ReportFileList({
  reports,
  folders,
  folderOf,
  onOpenDocument,
  onMove,
}: ReportFileListProps) {
  const [sort, setSort] = useState<{ key: SortKey; ascending: boolean }>({
    key: 'modified',
    ascending: false,
  })

  const rows = useMemo<FileRow[]>(() => {
    const flat = reports.flatMap((report) =>
      report.documents.map((document) => ({ document, report })),
    )
    const direction = sort.ascending ? 1 : -1
    return flat.sort((a, b) => compare(a, b, sort.key) * direction)
  }, [reports, sort])

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, ascending: !current.ascending }
        : { key, ascending: key === 'name' || key === 'type' },
    )

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-gray-200">
      {/* Header and rows share one column template so the list stays aligned while
          the name column absorbs whatever width is left. */}
      <div className="hidden items-center gap-4 border-b border-gray-200 bg-gray-50/80 px-3 py-2 sm:flex">
        {COLUMNS.map((column) => (
          <button
            key={column.key}
            type="button"
            onClick={() => toggleSort(column.key)}
            className={cn(
              'flex items-center gap-1 text-[11px] tracking-wider text-gray-500 uppercase transition-colors hover:text-gray-800 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
              column.className,
            )}
          >
            <span className="truncate">{column.label}</span>
            {sort.key === column.key &&
              (sort.ascending ? (
                <ArrowUp className="h-3 w-3 shrink-0" />
              ) : (
                <ArrowDown className="h-3 w-3 shrink-0" />
              ))}
          </button>
        ))}
        <span className="w-7 shrink-0" />
      </div>

      <ul className="divide-y divide-gray-100">
        {rows.map(({ document, report }) => (
          <li
            key={document.id}
            className="group flex items-center gap-4 px-3 transition-colors hover:bg-gray-50"
          >
            <button
              type="button"
              onClick={() => onOpenDocument(report, document.id)}
              title={document.name}
              className="flex min-w-0 flex-1 items-center gap-4 py-2 text-left focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
            >
              <span className="flex min-w-0 flex-1 items-center gap-2.5">
                <DocumentKindIcon kind={document.kind} className="h-8 w-8 rounded-md" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-gray-900">
                    {document.name}
                  </span>
                  <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
                    <DepartmentChip department={report.department} />
                    <span className="truncate text-[11px] text-gray-400 tabular-nums">
                      {report.reference} · {formatReportPeriodShort(report.period)} ·{' '}
                      {report.submittedBy.name}
                    </span>
                  </span>
                </span>
              </span>

              <span className="hidden w-44 shrink-0 truncate text-[12px] text-gray-600 tabular-nums sm:block">
                {formatFileTimestamp(document.uploadedAt)}
              </span>
              <span className="hidden w-40 shrink-0 truncate text-[12px] text-gray-600 sm:block">
                {fileTypeLabel(document)}
              </span>
              <span className="hidden w-24 shrink-0 text-right text-[12px] text-gray-600 tabular-nums sm:block">
                {formatFileSize(document.sizeBytes)}
              </span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`File ${report.reference} in a folder`}
                  className="w-7 shrink-0 rounded-md p-1 text-gray-400 opacity-0 transition-colors group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-600 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Move report to folder</DropdownMenuLabel>
                {folders.length === 0 && (
                  <DropdownMenuItem disabled>No folders yet</DropdownMenuItem>
                )}
                {folders.map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    disabled={folder.id === folderOf.get(report.id)}
                    onSelect={() => onMove(report, folder.id)}
                  >
                    <FolderInput className="h-3.5 w-3.5" />
                    <span className="truncate">{folder.name}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!folderOf.has(report.id)}
                  onSelect={() => onMove(report, null)}
                >
                  Back to {report.department} folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>
    </div>
  )
}
