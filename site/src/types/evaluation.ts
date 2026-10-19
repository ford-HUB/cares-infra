/** The kinds of question a director can drop into an evaluation form. */
export type EvaluationQuestionType =
  | 'short_answer'
  | 'paragraph'
  | 'multiple_choice'
  | 'checkboxes'
  | 'dropdown'
  | 'linear_scale'
  | 'star_rating'
  | 'date'
  | 'image_upload'

/** Faces available to a question or the form header — all loaded by `index.css`. */
export type EvaluationFontFamily =
  | 'inter'
  | 'lato'
  | 'montserrat'
  | 'lora'
  | 'merriweather'
  | 'playfair'
  | 'garamond'

export type EvaluationFontSize = 'sm' | 'md' | 'lg' | 'xl'

export interface EvaluationTypography {
  fontFamily: EvaluationFontFamily
  fontSize: EvaluationFontSize
}

export interface EvaluationQuestion {
  id: string
  type: EvaluationQuestionType
  title: string
  /** Helper text shown under the title — Google Forms' "description". */
  description: string
  required: boolean
  /** Choices for multiple choice, checkboxes and dropdown. */
  options: string[]
  /** Upper bound for linear scale (1–N) and star rating (max stars). */
  scaleMax: number
  scaleMinLabel: string
  scaleMaxLabel: string
  /** Image upload only: how many photos a participant may attach. */
  maxFiles: number
  typography: EvaluationTypography
}

export interface EvaluationForm {
  id: string
  title: string
  description: string
  headerTypography: EvaluationTypography
  questions: EvaluationQuestion[]
  status: 'draft' | 'published'
  /** Served for any event with no questionnaire assigned to it. One form holds this. */
  isDefault: boolean
  /** Events this questionnaire is assigned to — the Forms page's reach. */
  assignedEvents: number
  /** Responses recorded against it, across every event it has served. */
  responseCount: number
  createdAt: string
  updatedAt: string
}

/**
 * One event pointed at one questionnaire. The event carries the assignment, so an
 * event has at most one and a questionnaire can serve many.
 */
export interface EvaluationAssignment {
  id: string
  formId: string
  formTitle: string
  formStatus: 'draft' | 'published'
  eventId: number
  eventTitle: string
  eventLocation: string
  eventStatus: string
  eventStarted: string
  eventEnded: string
  participants: number
  /** The director who assigned it; null once that account is gone. */
  assignedBy: string | null
  assignedAt: string
}

/** An event the assign picker offers, plus whatever questionnaire it already carries. */
export interface AssignableEvent {
  id: number
  title: string
  location: string
  status: string
  participants: number
  started: string
  ended: string
  assignedFormId: string | null
}

/** Page-level tallies for the Forms screen — the parts and the whole they split. */
export interface EvaluationFormCounts {
  /** Questionnaires, whatever their status. */
  forms: number
  published: number
  draft: number
  /** Events covered by an assignment of their own. */
  assignedEvents: number
  /** Events with no assignment — they answer the default questionnaire. */
  unassignedEvents: number
  responses: number
}

/**
 * A single answer keyed to a question; the value shape follows the question type.
 * An image upload holds its stored image keys — read them through the response's
 * image route, never directly.
 */
export type EvaluationAnswerValue = string | string[] | number | null

export interface EvaluationResponse {
  id: string
  /** The questionnaire that collected it — events can ask different ones. */
  formId: string
  formTitle: string
  participant: {
    id: string
    firstName: string
    lastName: string
    email: string
    department: string | null
  }
  eventId: number
  /** The event's title, for the row and the search box. */
  event: string
  submittedAt: string
  /** The star rating the participant gave, surfaced on the row itself. */
  rating: number
  status: 'complete' | 'partial'
  answers: Record<string, EvaluationAnswerValue>
}
