import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AssignFormDialog } from '../../components/evaluation-forms/assign-form-dialog'
import { EvaluationFormDetail } from '../../components/evaluation-forms/evaluation-form-detail'
import { EvaluationFormGallery } from '../../components/evaluation-forms/evaluation-form-gallery'
import { EvaluationFormTable } from '../../components/evaluation-forms/evaluation-form-table'
import { EvaluationFormsSummary } from '../../components/evaluation-forms/evaluation-forms-summary'
import { EvaluationFormsToolbar } from '../../components/evaluation-forms/evaluation-forms-toolbar'
import { NewEvaluationFormDialog } from '../../components/evaluation-forms/new-evaluation-form-dialog'
import { DeleteFormDialog } from '../../components/evaluation-forms/ui/delete-form-dialog'
import { EvaluationFormsEmpty } from '../../components/evaluation-forms/ui/evaluation-forms-empty'
import { ContentShell } from '../../components/portal/ui/content-shell'
import {
  FORM_STATUS_FILTER_ALL,
  type FormSort,
  type FormStatusFilter,
  type FormViewMode,
} from '../../constants/evaluation-forms'
import { ADMIN_EVALUATION_QUESTIONNAIRE_PATH } from '../../constants/routes'
import { useEvaluationStore } from '../../store/evaluation-store'
import type { EvaluationAssignment, EvaluationForm } from '../../types/evaluation'

/**
 * The questionnaire library: every form the director has built, and which events ask
 * it. Same shape as Live Certificates — a built artefact on the left of the errand,
 * the events it has been deployed to on the right.
 */
export function EvaluationFormsPage() {
  const navigate = useNavigate()
  const forms = useEvaluationStore((s) => s.forms)
  const formsInitialized = useEvaluationStore((s) => s.formsInitialized)
  const formsLoading = useEvaluationStore((s) => s.formsLoading)
  const assignments = useEvaluationStore((s) => s.assignments)
  const assignableEvents = useEvaluationStore((s) => s.assignableEvents)
  const assignmentsLoading = useEvaluationStore((s) => s.assignmentsLoading)
  const assignmentsInitialized = useEvaluationStore((s) => s.assignmentsInitialized)
  const fetchForms = useEvaluationStore((s) => s.fetchForms)
  const fetchAssignments = useEvaluationStore((s) => s.fetchAssignments)
  const assignForm = useEvaluationStore((s) => s.assignForm)
  const unassignForm = useEvaluationStore((s) => s.unassignForm)
  const makeDefaultForm = useEvaluationStore((s) => s.makeDefaultForm)
  const deleteForm = useEvaluationStore((s) => s.deleteForm)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<FormStatusFilter>(FORM_STATUS_FILTER_ALL)
  const [sort, setSort] = useState<FormSort>('recent')
  const [view, setView] = useState<FormViewMode>('grid')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [assigning, setAssigning] = useState<EvaluationForm | null>(null)
  const [deleting, setDeleting] = useState<EvaluationForm | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void fetchForms()
    void fetchAssignments()
  }, [fetchForms, fetchAssignments])

  // Search narrows the whole the summary describes; status is that whole's own split,
  // so the segments stay measured against every questionnaire still in scope.
  const inScope = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return forms

    return forms.filter(
      (form) =>
        form.title.toLowerCase().includes(term) ||
        form.description.toLowerCase().includes(term) ||
        form.questions.some((question) =>
          question.title.toLowerCase().includes(term),
        ),
    )
  }, [forms, search])

  const counts = useMemo(() => {
    const assignedEvents = assignments.length
    return {
      forms: inScope.length,
      published: inScope.filter((form) => form.status === 'published').length,
      draft: inScope.filter((form) => form.status === 'draft').length,
      assignedEvents,
      unassignedEvents: Math.max(assignableEvents.length - assignedEvents, 0),
      responses: inScope.reduce((total, form) => total + form.responseCount, 0),
    }
  }, [inScope, assignments, assignableEvents])

  const visible = useMemo(() => {
    const rows =
      status === FORM_STATUS_FILTER_ALL
        ? [...inScope]
        : inScope.filter((form) => form.status === status)

    return rows.sort((a, b) => {
      if (sort === 'reach') return b.assignedEvents - a.assignedEvents
      if (sort === 'responses') return b.responseCount - a.responseCount
      if (sort === 'title') return a.title.localeCompare(b.title)
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [inScope, status, sort])

  const selected = useMemo(
    () => visible.find((form) => form.id === selectedId) ?? null,
    [visible, selectedId],
  )

  const showSkeleton = !formsInitialized || (formsLoading && forms.length === 0)
  const filtered = search.trim().length > 0 || status !== FORM_STATUS_FILTER_ALL

  const clearFilters = () => {
    setSearch('')
    setStatus(FORM_STATUS_FILTER_ALL)
  }

  const openBuilder = (form?: EvaluationForm | string) => {
    const id = typeof form === 'string' ? form : form?.id
    navigate(id ? `${ADMIN_EVALUATION_QUESTIONNAIRE_PATH}?form=${id}` : ADMIN_EVALUATION_QUESTIONNAIRE_PATH)
  }

  const handleAssign = async (eventId: number) => {
    if (!assigning) return
    setSaving(true)
    const result = await assignForm(assigning.id, eventId)
    setSaving(false)
    if (!result.ok) {
      toast.error(result.message ?? 'The questionnaire could not be assigned')
      return
    }
    const event = assignableEvents.find((one) => one.id === eventId)
    toast.success(`${assigning.title} now asked at ${event?.title ?? 'the event'}`)
    setAssigning(null)
  }

  const handleUnassign = async (assignment: EvaluationAssignment) => {
    const result = await unassignForm(assignment.id)
    if (result.ok) {
      toast.success(`${assignment.eventTitle} is back on the default questionnaire`)
    } else {
      toast.error(result.message ?? 'The assignment could not be removed')
    }
  }

  const handleDelete = async (form: EvaluationForm) => {
    setSaving(true)
    const result = await deleteForm(form.id)
    setSaving(false)
    if (!result.ok) {
      toast.error(result.message ?? 'The questionnaire could not be deleted')
      return
    }
    toast.success(`${form.title} deleted`)
    setDeleting(null)
    if (selectedId === form.id) setSelectedId(null)
  }

  const handleMakeDefault = async (form: EvaluationForm) => {
    const result = await makeDefaultForm(form.id)
    if (result.ok) {
      toast.success(`${form.title} is now asked wherever no other questionnaire is`)
    } else {
      toast.error(result.message ?? 'The default could not be changed')
    }
  }

  const handleAction = (action: string, form: EvaluationForm) => {
    if (action === 'edit') return openBuilder(form)
    if (action === 'assign') return setAssigning(form)
    if (action === 'preview') return setSelectedId(form.id)
    if (action === 'default') return void handleMakeDefault(form)
    if (action === 'delete') return setDeleting(form)
  }

  return (
    <ContentShell variant="full">
      <EvaluationFormsToolbar
        search={search}
        sort={sort}
        view={view}
        shown={visible.length}
        total={forms.length}
        initialized={formsInitialized}
        onSearchChange={setSearch}
        onSortChange={setSort}
        onViewChange={setView}
        onCreate={() => setCreating(true)}
      />

      <EvaluationFormsSummary
        counts={counts}
        status={status}
        onStatusChange={setStatus}
      />

      <div className="min-w-0">
        {!showSkeleton && visible.length === 0 ? (
          <EvaluationFormsEmpty
            filtered={filtered}
            errored={formsInitialized && forms.length === 0 && !filtered}
            onClearFilters={clearFilters}
            onOpenBuilder={() => openBuilder()}
          />
        ) : view === 'grid' ? (
          <EvaluationFormGallery
            forms={visible}
            showSkeleton={showSkeleton}
            selectedId={selected?.id}
            onSelect={(form) => setSelectedId(form.id)}
            onAction={handleAction}
          />
        ) : (
          <EvaluationFormTable
            forms={visible}
            showSkeleton={showSkeleton}
            selectedId={selected?.id}
            onSelect={(form) => setSelectedId(form.id)}
            onAction={handleAction}
          />
        )}
      </div>

      {selected && (
        <EvaluationFormDetail
          form={selected}
          assignments={assignments.filter((one) => one.formId === selected.id)}
          open
          onOpenChange={(next) => !next && setSelectedId(null)}
          onAction={handleAction}
          onUnassign={(assignment) => void handleUnassign(assignment)}
        />
      )}

      <AssignFormDialog
        form={assigning}
        events={assignableEvents}
        loading={assignmentsLoading && !assignmentsInitialized}
        saving={saving}
        onOpenChange={(next) => !next && setAssigning(null)}
        onAssign={(eventId) => void handleAssign(eventId)}
      />

      <DeleteFormDialog
        form={deleting}
        saving={saving}
        onOpenChange={(next) => !next && setDeleting(null)}
        onConfirm={(form) => void handleDelete(form)}
      />

      <NewEvaluationFormDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(id) => {
          setCreating(false)
          openBuilder(id)
        }}
      />
    </ContentShell>
  )
}
