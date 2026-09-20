import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { QuestionnaireBuilder } from '../../components/evaluation/questionnaire-builder'
import { QuestionnairePreview } from '../../components/evaluation/questionnaire-preview'
import { QuestionnaireToolbar } from '../../components/evaluation/questionnaire-toolbar'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { useEvaluationStore } from '../../store/evaluation-store'

export function EvaluationQuestionnairePage() {
  const form = useEvaluationStore((s) => s.form)
  const initialized = useEvaluationStore((s) => s.formInitialized)
  const dirty = useEvaluationStore((s) => s.dirty)
  const saving = useEvaluationStore((s) => s.saving)
  const fetchForm = useEvaluationStore((s) => s.fetchForm)
  const saveForm = useEvaluationStore((s) => s.saveForm)

  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    if (!initialized) void fetchForm()
  }, [initialized, fetchForm])

  const handleSave = async () => {
    const result = await saveForm()
    if (result.ok) toast.success(result.message ?? 'Questionnaire saved')
    else toast.error(result.message ?? 'The questionnaire could not be saved')
  }

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      <QuestionnaireToolbar
        form={form}
        initialized={initialized}
        dirty={dirty}
        saving={saving}
        previewing={previewing}
        onTogglePreview={() => setPreviewing((value) => !value)}
        onSave={() => void handleSave()}
      />

      {previewing && form ? <QuestionnairePreview form={form} /> : <QuestionnaireBuilder />}
    </ContentShell>
  )
}
