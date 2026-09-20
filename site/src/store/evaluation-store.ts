import { create } from 'zustand'
import {
  DEFAULT_QUESTION_TYPOGRAPHY,
  DEFAULT_SCALE_MAX,
  QUESTION_MAX_OPTIONS,
  QUESTION_TYPE_META,
} from '../constants/evaluation'
import {
  getEvaluationForm,
  listEvaluationResponses,
  saveEvaluationForm,
} from '../services/evaluation-service'
import type {
  EvaluationForm,
  EvaluationQuestion,
  EvaluationQuestionType,
  EvaluationResponse,
  EvaluationTypography,
} from '../types/evaluation'

interface EvaluationState {
  form: EvaluationForm | null
  formLoading: boolean
  formInitialized: boolean
  /** True once anything changed since the last load or save. */
  dirty: boolean
  saving: boolean
  /** The card the builder's floating rail attaches to — new questions insert after it. */
  activeQuestionId: string | null

  responses: EvaluationResponse[]
  responsesLoading: boolean
  responsesInitialized: boolean

  fetchForm: () => Promise<void>
  /** Saves as-is; pass a status to move between draft and published in the same call. */
  saveForm: (status?: EvaluationForm['status']) => Promise<{ ok: boolean; message?: string }>
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
    form: null,
    formLoading: false,
    formInitialized: false,
    dirty: false,
    saving: false,
    activeQuestionId: null,
    responses: [],
    responsesLoading: false,
    responsesInitialized: false,

    fetchForm: async () => {
      set({ formLoading: true })
      const result = await getEvaluationForm()
      const form = result.success ? result.data : null
      set({
        form,
        formLoading: false,
        formInitialized: true,
        dirty: false,
        activeQuestionId: form?.questions[0]?.id ?? null,
      })
    },

    saveForm: async (status) => {
      const { form } = get()
      if (!form) return { ok: false, message: 'Nothing to save' }
      set({ saving: true })
      const result = await saveEvaluationForm(form, status)
      set({ saving: false })
      if (result.success && result.data) set({ form: result.data, dirty: false })
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
