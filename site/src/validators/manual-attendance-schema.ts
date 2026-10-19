import { z } from 'zod'
import { MANUAL_ATTENDANCE_REASON_MAX } from '../constants/attendees'

export const manualAttendanceSchema = z.object({
  /** Optional, but it lands in the row's remarks and the audit trail. */
  reason: z
    .string()
    .trim()
    .max(
      MANUAL_ATTENDANCE_REASON_MAX,
      `Reason must not exceed ${MANUAL_ATTENDANCE_REASON_MAX} characters`,
    ),
})

export type ManualAttendanceFormValues = z.infer<typeof manualAttendanceSchema>
