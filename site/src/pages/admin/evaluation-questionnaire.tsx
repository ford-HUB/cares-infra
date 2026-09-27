import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { QuestionnaireBuilder } from '../../components/evaluation/questionnaire-builder'
import { QuestionnairePreview } from '../../components/evaluation/questionnaire-preview'
import { QuestionnaireToolbar } from '../../components/evaluation/questionnaire-toolbar'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { useEvaluationStore } from '../../store/evaluation-store'

/** Which questionnaire the builder opens on — Forms links here with it set. */
const FORM_PARAM = 'form'

export function EvaluationQuestionnairePage() {
  const [params, setParams] = useSearchParams()
  const forms = useEvaluationStore((s) => s.forms)
  const form = useEvaluationStore((s) => s.form)
  const initialized = useEvaluationStore((s) => s.formInitialized)
  const dirty = useEvaluationStore((s) => s.dirty)
  const saving = useEvaluationStore((s) => s.saving)
  const openForm = useEvaluationStore((s) => s.openForm)
  const saveForm = useEvaluationStore((s) => s.saveForm)

  const [previewing, setPreviewing] = useState(false)
  const formId = params.get(FORM_PARAM) ?? undefined

  useEffect(() => {
    void openForm(formId)
  }, [openForm, formId])

  // The url carries the open questionnaire, so a switch is a navigation — reload
  // and back both land on the one the director was editing.
  const handleSelect = (id: string) => {
    if (dirty && !window.confirm('Leave this questionnaire? Unsaved changes are lost.')) {
      return
    }
    setParams({ [FORM_PARAM]: id })
  }

  const handleSave = async () => {
    const result = await saveForm()
    if (result.ok) toast.success(result.message ?? 'Questionnaire saved')
    else toast.error(result.message ?? 'The questionnaire could not be saved')
  }

  // Publishing is a save with the status flipped — volunteers only ever see a
  // published form on a completed event's feedback screen.
  const handlePublish = async () => {
    const result = await saveForm('published')
    if (result.ok) toast.success('Questionnaire published — assign it to an event next')
    else toast.error(result.message ?? 'The questionnaire could not be published')
  }

  return (
    <ContentShell variant="full" className="flex flex-col">
      <QuestionnaireToolbar
        form={form}
        forms={forms}
        initialized={initialized}
        dirty={dirty}
        saving={saving}
        previewing={previewing}
        onSelectForm={handleSelect}
        onTogglePreview={() => setPreviewing((value) => !value)}
        onSave={() => void handleSave()}
        onPublish={() => void handlePublish()}
      />

      {previewing && form ? <QuestionnairePreview form={form} /> : <QuestionnaireBuilder />}
    </ContentShell>
  )
}
