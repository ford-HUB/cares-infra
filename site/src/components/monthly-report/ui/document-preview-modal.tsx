import { useEffect, useMemo, useState } from 'react'
import { Download, Minus, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize } from '../../../constants/formatting'
import {
  DOCUMENT_KIND_LABELS,
  PREVIEWABLE_DOCUMENT_KINDS,
} from '../../../constants/monthly-report'
import { loadReportDocument } from '../../../services/shared/report-document-cache'
import type { MonthlyReport, ReportDocument } from '../../../types/monthly-report'
import { DocumentKindIcon } from './document-kind-icon'

interface DocumentPreviewModalProps {
  report: MonthlyReport
  /** File the "Open Docs" button was pressed on; the rail can switch away from it. */
  initialDocumentId: string
  onClose: () => void
}

const ZOOM_STEPS = [0.8, 0.9, 1, 1.15, 1.3] as const
const DEFAULT_ZOOM_INDEX = 2

/**
 * The director has to read the submission before deciding on it, so the file opens in
 * place rather than downloading. The bytes come from the private bucket through the
 * API, which is also why the download link points at the fetched copy rather than the
 * route: a plain link would send no token and land on a 401.
 */
export function DocumentPreviewModal({
  report,
  initialDocumentId,
  onClose,
}: DocumentPreviewModalProps) {
  const [activeId, setActiveId] = useState(initialDocumentId)
  const [zoomIndex, setZoomIndex] = useState<number>(DEFAULT_ZOOM_INDEX)
  const [loaded, setLoaded] = useState<{
    route: string
    objectUrl: string | null
  } | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const active = useMemo<ReportDocument>(
    () => report.documents.find((one) => one.id === activeId) ?? report.documents[0],
    [report.documents, activeId],
  )

  // Every file is fetched, previewable or not: the download button needs the bytes as
  // much as the viewer does. The route is stored beside the result rather than reset
  // when the rail switches files, so switching cannot briefly show the previous file.
  useEffect(() => {
    let live = true
    const route = active.url

    loadReportDocument(route)
      .then((objectUrl) => {
        if (live) setLoaded({ route, objectUrl })
      })
      .catch(() => {
        if (live) setLoaded({ route, objectUrl: null })
      })

    return () => {
      live = false
    }
  }, [active.url])

  const current = loaded?.route === active.url ? loaded : null
  const objectUrl = current?.objectUrl ?? null
  const failed = current !== null && current.objectUrl === null

  const zoom = ZOOM_STEPS[zoomIndex]
  const previewable = PREVIEWABLE_DOCUMENT_KINDS.includes(active.kind)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${active.name} preview`}
      className="fixed inset-0 z-50 flex flex-col bg-gray-900/70 p-3 sm:p-6"
    >
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <DocumentKindIcon kind={active.kind} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-gray-900" title={active.name}>
                {active.name}
              </p>
              <p className="truncate text-[11px] text-gray-500">
                {report.reference} · {DOCUMENT_KIND_LABELS[active.kind]} ·{' '}
                {formatFileSize(active.sizeBytes)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {previewable && (
              <div className="hidden items-center gap-1 rounded-lg border border-gray-200 p-0.5 sm:flex">
                <button
                  type="button"
                  onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
                  disabled={zoomIndex === 0}
                  aria-label="Zoom out"
                  className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-11 text-center text-[12px] text-gray-600 tabular-nums">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setZoomIndex((index) => Math.min(ZOOM_STEPS.length - 1, index + 1))
                  }
                  disabled={zoomIndex === ZOOM_STEPS.length - 1}
                  aria-label="Zoom in"
                  className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <a
              href={objectUrl ?? undefined}
              download={active.name}
              aria-disabled={objectUrl === null}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-[13px] text-gray-700 transition-colors hover:bg-gray-50',
                objectUrl === null && 'pointer-events-none opacity-50',
              )}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* One report can carry a narrative plus its annexes; the rail keeps them
              in the same viewer instead of closing back out to the panel. */}
          {report.documents.length > 1 && (
            <nav
              aria-label="Attached files"
              className="hidden w-60 shrink-0 space-y-1 overflow-y-auto border-r border-gray-200 bg-gray-50 p-2 lg:block"
            >
              {report.documents.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => setActiveId(document.id)}
                  aria-pressed={document.id === active.id}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
                    document.id === active.id
                      ? 'bg-white ring-1 ring-gray-200'
                      : 'hover:bg-white/70',
                  )}
                >
                  <DocumentKindIcon kind={document.kind} className="h-8 w-8" />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium text-gray-800">
                      {document.name}
                    </span>
                    <span className="block text-[11px] text-gray-400">
                      {formatFileSize(document.sizeBytes)}
                    </span>
                  </span>
                </button>
              ))}
            </nav>
          )}

          <div className="min-h-0 flex-1 overflow-auto bg-gray-100 p-4 sm:p-6">
            {failed ? (
              <PreviewNotice
                document={active}
                title="This file could not be opened"
                body={`${active.name} is attached to ${report.reference}, but the portal could not read it back. Try again, or ask the coordinator to resubmit it.`}
              />
            ) : !previewable ? (
              <PreviewNotice
                document={active}
                title={`${DOCUMENT_KIND_LABELS[active.kind]} files open outside the portal`}
                body={`${active.name} is attached to ${report.reference}. Download it to review the figures, then come back to record the decision.`}
                downloadUrl={objectUrl}
              />
            ) : objectUrl === null ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-[12px] text-gray-500">Opening {active.name}…</p>
              </div>
            ) : (
              <div
                className="mx-auto flex h-full flex-col"
                style={{ width: `${Math.round(zoom * 46)}rem`, maxWidth: '100%' }}
              >
                {active.kind === 'image' ? (
                  <img
                    src={objectUrl}
                    alt={active.name}
                    className="mx-auto rounded-sm bg-white shadow-md ring-1 ring-gray-200"
                  />
                ) : (
                  <iframe
                    src={objectUrl}
                    title={active.name}
                    className="h-full min-h-[32rem] w-full rounded-sm bg-white shadow-md ring-1 ring-gray-200"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** The download-only and failed states read the same; only the wording differs. */
function PreviewNotice({
  document,
  title,
  body,
  downloadUrl,
}: {
  document: ReportDocument
  title: string
  body: string
  downloadUrl?: string | null
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <DocumentKindIcon kind={document.kind} className="h-11 w-11 rounded-xl" />
      <p className="text-[13px] font-medium text-gray-700">{title}</p>
      <p className="max-w-sm text-[12px] text-gray-500">{body}</p>
      {downloadUrl && (
        <a
          href={downloadUrl}
          download={document.name}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-3 text-[13px] font-medium text-white transition-colors hover:opacity-90"
        >
          <Download className="h-3.5 w-3.5" />
          Download file
        </a>
      )}
    </div>
  )
}
