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

  // Publishing is a save with the status flipped — volunteers only ever see a
  // published form on a completed event's feedback screen.
  const handlePublish = async () => {
    const result = await saveForm('published')
    if (result.ok) toast.success('Questionnaire published — volunteers can now answer it')
    else toast.error(result.message ?? 'The questionnaire could not be published')
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
        onPublish={() => void handlePublish()}
      />

      {previewing && form ? <QuestionnairePreview form={form} /> : <QuestionnaireBuilder />}
    </ContentShell>
  )
}
