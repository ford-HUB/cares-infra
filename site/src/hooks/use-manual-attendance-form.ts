import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAttendeeStore } from '../store/attendee-store'
import {
  manualAttendanceSchema,
  type ManualAttendanceFormValues,
} from '../validators/manual-attendance-schema'

const defaultValues: ManualAttendanceFormValues = { reason: '' }

export function useManualAttendanceForm(
  eventAttendanceIds: string[],
  onDone: () => void,
) {
  const markPresent = useAttendeeStore((state) => state.markPresent)

  const form = useForm<ManualAttendanceFormValues>({
    resolver: zodResolver(manualAttendanceSchema),
    defaultValues,
  })

  const onSubmit = form.handleSubmit(async (values) => {
    if (eventAttendanceIds.length === 0) return

    const res = await markPresent(eventAttendanceIds, values.reason.trim())

    if (res.success && res.data) {
      const count = res.data.marked.length
      const skipped = res.data.alreadyCompleted
      toast.success(
        `Marked ${count} participant${count === 1 ? '' : 's'} present` +
          (skipped > 0 ? ` · ${skipped} already completed` : ''),
      )
      form.reset(defaultValues)
      onDone()
      return
    }

    toast.error(res.message ?? 'Attendance could not be marked')
  })

  return { form, onSubmit, submitting: form.formState.isSubmitting }
}
