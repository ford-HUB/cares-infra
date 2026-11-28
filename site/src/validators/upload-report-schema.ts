import { z } from 'zod'
import {
  DEPARTMENT_ORDER,
  REPORT_SUMMARY_MAX_LENGTH,
  REPORT_TITLE_MAX_LENGTH,
} from '../constants/monthly-report'

/** `2026-08`, from `<input type="month">`, as the server expects. */
const reportPeriodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Pick the reporting month')

// `valueAsNumber` inputs (empty is NaN); `z.coerce` would widen the input type to `unknown`.
const countSchema = z
  .number({ message: 'Enter a whole number' })
  .int('Enter a whole number')
  .min(0, 'Cannot be negative')

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
})

// Attachments live outside the schema; see `useUploadReportForm`.

export type UploadReportFormValues = z.infer<typeof uploadReportSchema>

export const uploadReportDefaultValues: UploadReportFormValues = {
  title: '',
  period: '',
  department: 'CCS',
  summary: '',
  metrics: { events: 0, volunteers: 0, serviceHours: 0, beneficiaries: 0 },
}
