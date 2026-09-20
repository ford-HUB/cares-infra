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
  typography: EvaluationTypography
}

export interface EvaluationForm {
  id: string
  title: string
  description: string
  headerTypography: EvaluationTypography
  questions: EvaluationQuestion[]
  status: 'draft' | 'published'
  updatedAt: string
}

/** A single answer keyed to a question; the value shape follows the question type. */
export type EvaluationAnswerValue = string | string[] | number | null

export interface EvaluationResponse {
  id: string
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
