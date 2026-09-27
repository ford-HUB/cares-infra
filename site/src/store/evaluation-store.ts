import { create } from 'zustand'
import {
  DEFAULT_QUESTION_TYPOGRAPHY,
  DEFAULT_SCALE_MAX,
  QUESTION_MAX_OPTIONS,
  QUESTION_TYPE_META,
} from '../constants/evaluation'
import {
  assignEvaluationForm,
  createEvaluationForm,
  deleteEvaluationForm,
  getEvaluationForm,
  listAssignableEvents,
  listEvaluationAssignments,
  listEvaluationForms,
  listEvaluationResponses,
  saveEvaluationForm,
  setDefaultEvaluationForm,
  unassignEvaluationForm,
} from '../services/evaluation-service'
import type {
  AssignableEvent,
  EvaluationAssignment,
  EvaluationForm,
  EvaluationQuestion,
  EvaluationQuestionType,
  EvaluationResponse,
  EvaluationTypography,
} from '../types/evaluation'

/** What a mutating call hands back to the page, which turns it into a toast. */
export interface EvaluationResult {
  ok: boolean
  message?: string
}

interface EvaluationState {
  /** Every questionnaire — the Forms page's list and the builder's switcher. */
  forms: EvaluationForm[]
  formsLoading: boolean
  formsInitialized: boolean

  /** The questionnaire open in the builder; one of `forms`, loaded in full. */
  form: EvaluationForm | null
  formLoading: boolean
  formInitialized: boolean
  /** True once anything changed since the last load or save. */
  dirty: boolean
  saving: boolean
  /** The card the builder's floating rail attaches to — new questions insert after it. */
  activeQuestionId: string | null

  assignments: EvaluationAssignment[]
  assignableEvents: AssignableEvent[]
  assignmentsLoading: boolean
  assignmentsInitialized: boolean

  responses: EvaluationResponse[]
  responsesLoading: boolean
  responsesInitialized: boolean

  fetchForms: () => Promise<void>
  /** Opens one questionnaire in the builder; without an id, the first of the list. */
  openForm: (formId?: string) => Promise<void>
  createForm: (title: string) => Promise<EvaluationResult & { id?: string }>
  deleteForm: (formId: string) => Promise<EvaluationResult>
  makeDefaultForm: (formId: string) => Promise<EvaluationResult>

  fetchAssignments: () => Promise<void>
  assignForm: (formId: string, eventId: number) => Promise<EvaluationResult>
  unassignForm: (assignmentId: string) => Promise<EvaluationResult>

  /** Saves as-is; pass a status to move between draft and published in the same call. */
  saveForm: (status?: EvaluationForm['status']) => Promise<EvaluationResult>
  updateForm: (patch: Partial<Pick<EvaluationForm, 'title' | 'description'>>) => void
  updateHeaderTypography: (patch: Partial<EvaluationTypography>) => void
  setActiveQuestion: (id: string | null) => void
  addQuestion: (type: EvaluationQuestionType) => void
  updateQuestion: (id: string, patch: Partial<EvaluationQuestion>) => void
  changeQuestionType: (id: string, type: EvaluationQuestionType) => void
  duplicateQuestion: (id: string) => void
  removeQuestion: (id: string) => void
  moveQuestion: (from: number, to: number) => void
  addOption: (id: string) => void
  updateOption: (id: string, index: number, value: string) => void
  removeOption: (id: string, index: number) => void

  fetchResponses: () => Promise<void>
}

const newId = () => `q-${Math.random().toString(36).slice(2, 9)}`

function blankQuestion(type: EvaluationQuestionType): EvaluationQuestion {
  const meta = QUESTION_TYPE_META[type]
  return {
    id: newId(),
    type,
    title: '',
    description: '',
    required: false,
    options: meta.hasOptions ? ['Option 1'] : [],
    scaleMax: DEFAULT_SCALE_MAX,
    scaleMinLabel: '',
    scaleMaxLabel: '',
    typography: { ...DEFAULT_QUESTION_TYPOGRAPHY },
  }
}

export const useEvaluationStore = create<EvaluationState>((set, get) => {
  /** Every edit goes through here so `dirty` cannot be forgotten. */
  const patchForm = (mutate: (form: EvaluationForm) => EvaluationForm) => {
    const { form } = get()
    if (!form) return
    set({ form: mutate(form), dirty: true })
  }

  const patchQuestion = (
    id: string,
    mutate: (question: EvaluationQuestion) => EvaluationQuestion,
  ) =>
    patchForm((form) => ({
      ...form,
      questions: form.questions.map((question) =>
        question.id === id ? mutate(question) : question,
      ),
    }))

  return {
    forms: [],
    formsLoading: false,
    formsInitialized: false,
    form: null,
    formLoading: false,
    formInitialized: false,
    dirty: false,
    saving: false,
    activeQuestionId: null,
    assignments: [],
    assignableEvents: [],
    assignmentsLoading: false,
    assignmentsInitialized: false,
    responses: [],
    responsesLoading: false,
    responsesInitialized: false,

    fetchForms: async () => {
      set({ formsLoading: true })
      const result = await listEvaluationForms()
      set({
        forms: result.success && result.data ? result.data : [],
        formsLoading: false,
        formsInitialized: true,
      })
    },

    /**
     * The list is the source of truth for which questionnaires exist, so opening
     * one loads the list first when it has not been read yet.
     */
    openForm: async (formId) => {
      if (!get().formsInitialized) await get().fetchForms()
      const target = formId ?? get().forms[0]?.id
      if (!target) {
        set({ form: null, formInitialized: true, dirty: false })
        return
      }
      // Re-opening the questionnaire already in the builder would throw away
      // unsaved edits, so it is left alone.
      if (get().form?.id === target && get().dirty) return

      set({ formLoading: true })
      const result = await getEvaluationForm(target)
      const form = result.success ? result.data : null
      set({
        form,
        formLoading: false,
        formInitialized: true,
        dirty: false,
        activeQuestionId: form?.questions[0]?.id ?? null,
      })
    },

    createForm: async (title) => {
      const result = await createEvaluationForm(title)
      if (!result.success || !result.data) {
        return { ok: false, message: result.message }
      }
      const created = result.data
      set((state) => ({
        forms: [created, ...state.forms],
        form: created,
        formInitialized: true,
        dirty: false,
        activeQuestionId: null,
      }))
      return { ok: true, message: result.message, id: created.id }
    },

    deleteForm: async (formId) => {
      const result = await deleteEvaluationForm(formId)
      if (!result.success) return { ok: false, message: result.message }
      set((state) => ({
        forms: state.forms.filter((one) => one.id !== formId),
        // The builder cannot stay on a questionnaire that is gone.
        form: state.form?.id === formId ? null : state.form,
        dirty: state.form?.id === formId ? false : state.dirty,
      }))
      return { ok: true, message: result.message }
    },

    makeDefaultForm: async (formId) => {
      const result = await setDefaultEvaluationForm(formId)
      if (!result.success || !result.data) {
        return { ok: false, message: result.message }
      }
      const updated = result.data
      // Exactly one row holds the flag, so the rest are cleared here too.
      set((state) => ({
        forms: state.forms.map((one) =>
          one.id === formId ? updated : { ...one, isDefault: false },
        ),
        form:
          state.form?.id === formId ? { ...state.form, isDefault: true } : state.form,
      }))
      return { ok: true, message: result.message }
    },

    /** The Forms page needs both halves at once: what is assigned and what could be. */
    fetchAssignments: async () => {
      set({ assignmentsLoading: true })
      const [assignments, events] = await Promise.all([
        listEvaluationAssignments(),
        listAssignableEvents(),
      ])
      set({
        assignments: assignments.success && assignments.data ? assignments.data : [],
        assignableEvents: events.success && events.data ? events.data : [],
        assignmentsLoading: false,
        assignmentsInitialized: true,
      })
    },

    assignForm: async (formId, eventId) => {
      const result = await assignEvaluationForm(formId, eventId)
      if (!result.success || !result.data) {
        return { ok: false, message: result.message }
      }
      const assignment = result.data
      set((state) => {
        // An event holds one assignment, so this replaces rather than appends.
        const rest = state.assignments.filter((one) => one.eventId !== eventId)
        const replaced = state.assignments.find((one) => one.eventId === eventId)
        return {
          assignments: [assignment, ...rest],
          assignableEvents: state.assignableEvents.map((event) =>
            event.id === eventId ? { ...event, assignedFormId: formId } : event,
          ),
          forms: state.forms.map((one) => {
            if (one.id === formId) {
              return { ...one, assignedEvents: one.assignedEvents + 1 }
            }
            if (replaced && one.id === replaced.formId) {
              return {
                ...one,
                assignedEvents: Math.max(one.assignedEvents - 1, 0),
              }
            }
            return one
          }),
        }
      })
      return { ok: true, message: result.message }
    },

    unassignForm: async (assignmentId) => {
      const removed = get().assignments.find((one) => one.id === assignmentId)
      const result = await unassignEvaluationForm(assignmentId)
      if (!result.success) return { ok: false, message: result.message }
      set((state) => ({
        assignments: state.assignments.filter((one) => one.id !== assignmentId),
        assignableEvents: state.assignableEvents.map((event) =>
          event.id === removed?.eventId ? { ...event, assignedFormId: null } : event,
        ),
        forms: state.forms.map((one) =>
          one.id === removed?.formId
            ? { ...one, assignedEvents: Math.max(one.assignedEvents - 1, 0) }
            : one,
        ),
      }))
      return { ok: true, message: result.message }
    },

    saveForm: async (status) => {
      const { form } = get()
      if (!form) return { ok: false, message: 'Nothing to save' }
      set({ saving: true })
      const result = await saveEvaluationForm(form, status)
      set({ saving: false })
      if (result.success && result.data) {
        const saved = result.data
        set((state) => ({
          form: saved,
          dirty: false,
          // The Forms page reads titles, statuses and counts off this list.
          forms: state.forms.some((one) => one.id === saved.id)
            ? state.forms.map((one) => (one.id === saved.id ? saved : one))
            : [saved, ...state.forms],
        }))
      }
      return { ok: result.success, message: result.message }
    },

    updateForm: (patch) => patchForm((form) => ({ ...form, ...patch })),

    updateHeaderTypography: (patch) =>
      patchForm((form) => ({
        ...form,
        headerTypography: { ...form.headerTypography, ...patch },
      })),

    setActiveQuestion: (id) => set({ activeQuestionId: id }),

    addQuestion: (type) => {
      const question = blankQuestion(type)
      patchForm((form) => {
        const at = form.questions.findIndex((q) => q.id === get().activeQuestionId)
        const questions = [...form.questions]
        questions.splice(at === -1 ? questions.length : at + 1, 0, question)
        return { ...form, questions }
      })
      set({ activeQuestionId: question.id })
    },

    updateQuestion: (id, patch) => patchQuestion(id, (q) => ({ ...q, ...patch })),

    changeQuestionType: (id, type) =>
      patchQuestion(id, (q) => {
        const meta = QUESTION_TYPE_META[type]
        return {
          ...q,
          type,
          // Keep choices when moving between choice types; seed one otherwise.
          options: meta.hasOptions ? (q.options.length ? q.options : ['Option 1']) : [],
        }
      }),

    duplicateQuestion: (id) => {
      const copyId = newId()
      patchForm((form) => {
        const index = form.questions.findIndex((q) => q.id === id)
        if (index === -1) return form
        const copy = { ...structuredClone(form.questions[index]), id: copyId }
        const questions = [...form.questions]
        questions.splice(index + 1, 0, copy)
        return { ...form, questions }
      })
      set({ activeQuestionId: copyId })
    },

    removeQuestion: (id) => {
      patchForm((form) => ({
        ...form,
        questions: form.questions.filter((q) => q.id !== id),
      }))
      if (get().activeQuestionId === id) {
        set({ activeQuestionId: get().form?.questions[0]?.id ?? null })
      }
    },

    moveQuestion: (from, to) =>
      patchForm((form) => {
        if (from === to || from < 0 || to < 0 || to >= form.questions.length) return form
        const questions = [...form.questions]
        const [moved] = questions.splice(from, 1)
        questions.splice(to, 0, moved)
        return { ...form, questions }
      }),

    addOption: (id) =>
      patchQuestion(id, (q) =>
        q.options.length >= QUESTION_MAX_OPTIONS
          ? q
          : { ...q, options: [...q.options, `Option ${q.options.length + 1}`] },
      ),

    updateOption: (id, index, value) =>
      patchQuestion(id, (q) => ({
        ...q,
        options: q.options.map((option, i) => (i === index ? value : option)),
      })),

    removeOption: (id, index) =>
      patchQuestion(id, (q) =>
        q.options.length <= 1 ? q : { ...q, options: q.options.filter((_, i) => i !== index) },
      ),

    fetchResponses: async () => {
      set({ responsesLoading: true })
      const result = await listEvaluationResponses()
      set({
        responses: result.success && result.data ? result.data : [],
        responsesLoading: false,
        responsesInitialized: true,
      })
    },
  }
})
