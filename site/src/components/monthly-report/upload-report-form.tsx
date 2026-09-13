import { useRef, useState } from 'react'
import { CloudUpload, Paperclip, Send, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize } from '../../constants/formatting'
import {
  DEPARTMENT_LABELS,
  DEPARTMENT_ORDER,
  REPORT_DOCUMENT_ACCEPT,
  REPORT_DOCUMENT_MAX_BYTES,
  REPORT_DOCUMENT_MAX_COUNT,
  REPORT_SUMMARY_MAX_LENGTH,
} from '../../constants/monthly-report'
import type { useUploadReportForm } from '../../hooks/use-upload-report-form'

type UploadReportFormProps = ReturnType<typeof useUploadReportForm>

const inputClass =
  'h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-800 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none disabled:bg-gray-50'

const METRIC_FIELDS = [
  { key: 'events', label: 'Events held' },
  { key: 'volunteers', label: 'Volunteers' },
  { key: 'serviceHours', label: 'Service hours' },
  { key: 'beneficiaries', label: 'Beneficiaries' },
] as const

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-medium text-gray-700">{label}</span>
        {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-red-600">{error}</span>}
    </label>
  )
}

/**
 * What the coordinator fills in each month: the figures the director will check,
 * a short account of the month, and the files that back both. Everything goes up
 * in one submission, so the form stays editable until the button is pressed.
 */
export function UploadReportForm({
  form,
  documents,
  submitting,
  addFiles,
  removeFile,
  onSubmit,
}: UploadReportFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const { errors } = form.formState
  const summary = form.watch('summary')

  return (
    <form
      onSubmit={onSubmit}
      className="flex min-h-0 flex-col overflow-hidden rounded-xl bg-white ring-1 ring-gray-200"
    >
      <header className="shrink-0 border-b border-gray-100 px-4 py-3">
        <p className="text-[11px] tracking-wider text-gray-500 uppercase">New report</p>
        <p className="mt-0.5 text-[12px] text-gray-500">
          Sent straight to the director. Once it is with them, it can no longer be
          edited — if it comes back, upload a corrected copy.
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <Field label="Report title" error={errors.title?.message}>
          <input
            {...form.register('title')}
            disabled={submitting}
            placeholder="e.g. CCS Community Extension — Monthly Report"
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Reporting month" error={errors.period?.message}>
            <input
              {...form.register('period')}
              type="month"
              disabled={submitting}
              className={inputClass}
            />
          </Field>

          <Field label="Department" error={errors.department?.message}>
            <select
              {...form.register('department')}
              disabled={submitting}
              className={inputClass}
            >
              {DEPARTMENT_ORDER.map((department) => (
                <option key={department} value={department}>
                  {department} — {DEPARTMENT_LABELS[department]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-[12px] font-medium text-gray-700">
            Figures for the month
          </legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {METRIC_FIELDS.map(({ key, label }) => (
              <Field key={key} label={label} error={errors.metrics?.[key]?.message}>
                <input
                  {...form.register(`metrics.${key}`, { valueAsNumber: true })}
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  disabled={submitting}
                  className={cn(inputClass, 'tabular-nums')}
                />
              </Field>
            ))}
          </div>
        </fieldset>

        <Field
          label="Summary"
          hint={`${summary.length}/${REPORT_SUMMARY_MAX_LENGTH}`}
          error={errors.summary?.message}
        >
          <textarea
            {...form.register('summary')}
            rows={5}
            maxLength={REPORT_SUMMARY_MAX_LENGTH}
            disabled={submitting}
            placeholder="What the department ran this month, who took part, and anything the director should know before reading the files."
            className={cn(inputClass, 'h-auto resize-y py-2 leading-relaxed')}
          />
        </Field>

        <div>
          <span className="mb-1 flex items-baseline justify-between gap-2">
            <span className="text-[12px] font-medium text-gray-700">Report files</span>
            <span className="text-[11px] text-gray-400 tabular-nums">
              {documents.length}/{REPORT_DOCUMENT_MAX_COUNT} · up to{' '}
              {formatFileSize(REPORT_DOCUMENT_MAX_BYTES)} each
            </span>
          </span>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept={REPORT_DOCUMENT_ACCEPT}
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files)
              event.target.value = ''
            }}
          />

          <button
            type="button"
            disabled={submitting}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              addFiles(event.dataTransfer.files)
            }}
            className={cn(
              'flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center transition-colors focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60',
              dragging
                ? 'border-[var(--cares-primary)] bg-emerald-50/60'
                : 'border-gray-300 bg-gray-50/60 hover:bg-gray-50',
            )}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--cares-primary)] ring-1 ring-gray-200">
              <CloudUpload className="h-5 w-5" />
            </span>
            <span className="text-[13px] font-medium text-gray-800">
              Drop files here or click to browse
            </span>
            <span className="text-[11px] text-gray-500">
              PDF, Word, Excel, or images
            </span>
          </button>

          {errors.documents?.message && (
            <span className="mt-1 block text-[11px] text-red-600">
              {errors.documents.message}
            </span>
          )}

          {documents.length > 0 && (
            <ul className="mt-2 divide-y divide-gray-100 rounded-lg ring-1 ring-gray-200">
              {documents.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}`}
                  className="flex items-center gap-2.5 px-3 py-2"
                >
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-gray-800">
                      {file.name}
                    </span>
                    <span className="block text-[11px] text-gray-400 tabular-nums">
                      {formatFileSize(file.size)}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    disabled={submitting}
                    onClick={() => removeFile(index)}
                    className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
        <p className="text-[11px] text-gray-500">
          The director is notified as soon as it lands.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-4 text-[13px] font-semibold text-white transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send className="h-3.5 w-3.5" />
          {submitting ? 'Uploading…' : 'Submit report'}
        </button>
      </footer>
    </form>
  )
}
