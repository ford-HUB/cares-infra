import { z } from 'zod'
import { SUSPENSION_REASON_MAX } from '../constants/access-control'

export const suspendActionsSchema = z.object({
  permissions: z
    .array(z.string())
    .min(1, 'Select at least one action to suspend'),
  reason: z
    .string()
    .trim()
    .min(10, 'Describe the violation in at least 10 characters')
    .max(
      SUSPENSION_REASON_MAX,
      `Reason must not exceed ${SUSPENSION_REASON_MAX} characters`,
    ),
  /** Days until the suspension lapses; `0` means it stays until an admin lifts it. */
  durationDays: z.number().int().min(0),
})

export type SuspendActionsFormValues = z.infer<typeof suspendActionsSchema>
