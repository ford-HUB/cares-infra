import { ArrowLeft, ArrowRight, Check, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DEPARTMENT_LABELS,
  DEPARTMENT_ORDER,
  REPORT_SUMMARY_MAX_LENGTH,
  UPLOAD_REPORT_STEPS,
} from '../../constants/monthly-report'
import type { useUploadReportForm } from '../../hooks/use-upload-report-form'
import { UploadFilesStep } from './ui/upload-files-step'

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

const secondaryButtonClass =
  'inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60'

const primaryButtonClass =
  'inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-4 text-[13px] font-semibold text-white transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60'

/**
 * Two pages: what the report says, then the files that back it. The details are
 * checked before the coordinator moves on, so the upload page never has to send
 * them back to fix a title; and the files are read while they are picked, so
 * Submit is one press.
 */
export function UploadReportForm({
  form,
  step,
  attachments,
  submitting,
  canSubmit,
  addFiles,
  removeFile,
  goToFiles,
  goToDetails,
  onSubmit,
}: UploadReportFormProps) {
  const { errors } = form.formState
  const summary = form.watch('summary')
  const stepIndex = UPLOAD_REPORT_STEPS.findIndex((one) => one.key === step)

  return (
    <form
      onSubmit={onSubmit}
      className="flex min-h-0 flex-col overflow-hidden rounded-xl bg-white ring-1 ring-gray-200"
    >
      <header className="shrink-0 border-b border-gray-100 px-4 py-3">
        <ol className="flex items-center gap-2">
          {UPLOAD_REPORT_STEPS.map((one, index) => {
            const done = index < stepIndex
            const active = index === stepIndex
            return (
              <li key={one.key} className="flex items-center gap-2">
                {index > 0 && <span aria-hidden className="h-px w-6 bg-gray-200" />}
                <span
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold tabular-nums',
                    active && 'bg-[var(--cares-primary)] text-white',
                    done && 'bg-emerald-50 text-emerald-700',
                    !active && !done && 'bg-gray-100 text-gray-400',
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span
                  className={cn(
                    'text-[12px] font-medium',
                    active ? 'text-gray-900' : 'text-gray-400',
                  )}
                >
                  {one.label}
                </span>
              </li>
            )
          })}
        </ol>
      </header>

      {step === 'details' ? (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <p className="text-[12px] text-gray-500">
            Sent straight to the director once submitted. If it comes back, upload a
            corrected copy as a new report.
          </p>

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
            label="Description"
            hint={`${summary.length}/${REPORT_SUMMARY_MAX_LENGTH}`}
            error={errors.summary?.message}
          >
            <textarea
              {...form.register('summary')}
              rows={6}
              maxLength={REPORT_SUMMARY_MAX_LENGTH}
              disabled={submitting}
              placeholder="What the department ran this month, who took part, and anything the director should know before reading the files."
              className={cn(inputClass, 'h-auto resize-y py-2 leading-relaxed')}
            />
          </Field>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <UploadFilesStep
            attachments={attachments}
            disabled={submitting}
            onAddFiles={addFiles}
            onRemove={removeFile}
          />
        </div>
      )}

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
        {step === 'details' ? (
          <>
            <p className="text-[11px] text-gray-500">
              Step 1 of {UPLOAD_REPORT_STEPS.length} — the files come next.
            </p>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void goToFiles()}
              className={primaryButtonClass}
            >
              Next: upload files
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={submitting}
              onClick={goToDetails}
              className={secondaryButtonClass}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <button type="submit" disabled={!canSubmit} className={primaryButtonClass}>
              <Send className="h-3.5 w-3.5" />
              {submitting ? 'Submitting…' : 'Submit report'}
            </button>
          </>
        )}
      </footer>
    </form>
  )
}
