import { z } from 'zod'
import {
  DEPARTMENT_ORDER,
  REPORT_DOCUMENT_MAX_COUNT,
  REPORT_SUMMARY_MAX_LENGTH,
  REPORT_TITLE_MAX_LENGTH,
} from '../constants/monthly-report'

/** `2026-08` — what a `<input type="month">` yields and what the server expects. */
const reportPeriodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Pick the reporting month')

// The inputs register with `valueAsNumber`, so no coercion here — `z.coerce` would
// widen the form's input type to `unknown`. An empty field arrives as NaN.
const countSchema = z
  .number({ message: 'Enter a whole number' })
  .int('Enter a whole number')
  .min(0, 'Cannot be negative')

/**
 * The attachments the coordinator picked, kept as `File`s until submit — they are
 * read into data URLs only once the rest of the form is valid.
 */
const attachmentSchema = z.custom<File>((value) => value instanceof File, {
  message: 'Attach a file',
})

export const uploadReportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give the report a title')
    .max(REPORT_TITLE_MAX_LENGTH, `Keep the title under ${REPORT_TITLE_MAX_LENGTH} characters`),
  period: reportPeriodSchema,
  department: z.enum(DEPARTMENT_ORDER, { message: 'Pick your department' }),
  summary: z
    .string()
    .trim()
    .min(1, 'Summarise the month in a few sentences')
    .max(
      REPORT_SUMMARY_MAX_LENGTH,
      `Keep the summary under ${REPORT_SUMMARY_MAX_LENGTH} characters`,
    ),
  metrics: z.object({
    events: countSchema,
    volunteers: countSchema,
    serviceHours: countSchema,
    beneficiaries: countSchema,
  }),
  documents: z
    .array(attachmentSchema)
    .min(1, 'Attach at least one report file')
    .max(REPORT_DOCUMENT_MAX_COUNT, `Attach up to ${REPORT_DOCUMENT_MAX_COUNT} files`),
})

export type UploadReportFormValues = z.infer<typeof uploadReportSchema>

export const uploadReportDefaultValues: UploadReportFormValues = {
  title: '',
  period: '',
  department: 'CCS',
  summary: '',
  metrics: { events: 0, volunteers: 0, serviceHours: 0, beneficiaries: 0 },
  documents: [],
}
