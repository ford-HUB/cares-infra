import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useEvaluationStore } from '../store/evaluation-store'
import {
  newEvaluationFormSchema,
  type NewEvaluationFormValues,
} from '../validators/new-evaluation-form-schema'

const EMPTY: NewEvaluationFormValues = { title: '' }

/**
 * Owns the "new questionnaire" form. The created id is handed back so the page can
 * open the builder on it — filing a questionnaire and writing it is one errand.
 */
export function useNewEvaluationForm(open: boolean, onCreated: (id: string) => void) {
  const createForm = useEvaluationStore((state) => state.createForm)
  const [saving, setSaving] = useState(false)

  const form = useForm<NewEvaluationFormValues>({
    resolver: zodResolver(newEvaluationFormSchema),
    defaultValues: EMPTY,
    mode: 'onChange',
  })

  // Reopening starts on a blank form rather than the last abandoned draft.
  const { reset } = form
  useEffect(() => {
    if (open) reset(EMPTY)
  }, [open, reset])

  const submit = form.handleSubmit(async (values) => {
    setSaving(true)
    const result = await createForm(values.title)
    setSaving(false)
    if (!result.ok || !result.id) {
      toast.error(result.message ?? 'The questionnaire could not be created')
      return
    }
    toast.success(`${values.title} created — add its questions next`)
    onCreated(result.id)
  })

  return { form, submit, saving }
}
