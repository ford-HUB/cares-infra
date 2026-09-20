import type { EvaluationForm, EvaluationResponse } from '../types/evaluation'

/**
 * Evaluation has no endpoint yet — the questionnaire builder and the answers table run
 * on the fixtures below. Swap each function for an `apiClient` call when the module
 * lands on the server; the return shapes are already the portal's internal ones.
 */

const MOCK_FORM: EvaluationForm = {
  id: 'form-1',
  title: 'Post-Event Volunteer Evaluation',
  description:
    'Tell us how the event went for you. Your answers help the CARES office plan the next one.',
  headerTypography: { fontFamily: 'inter', fontSize: 'xl' },
  status: 'draft',
  updatedAt: '2026-09-18T09:30:00.000Z',
  questions: [
    {
      id: 'q-rating',
      type: 'star_rating',
      title: 'Overall, how would you rate this event?',
      description: '',
      required: true,
      options: [],
      scaleMax: 5,
      scaleMinLabel: 'Poor',
      scaleMaxLabel: 'Excellent',
      typography: { fontFamily: 'inter', fontSize: 'md' },
    },
    {
      id: 'q-role',
      type: 'multiple_choice',
      title: 'Which role did you take on during the event?',
      description: '',
      required: true,
      options: ['Registration desk', 'Logistics', 'Medical support', 'Crowd assistance'],
      scaleMax: 5,
      scaleMinLabel: '',
      scaleMaxLabel: '',
      typography: { fontFamily: 'inter', fontSize: 'md' },
    },
    {
      id: 'q-briefing',
      type: 'linear_scale',
      title: 'How clear was the pre-event briefing?',
      description: '1 means not clear at all, 5 means very clear.',
      required: true,
      options: [],
      scaleMax: 5,
      scaleMinLabel: 'Not clear',
      scaleMaxLabel: 'Very clear',
      typography: { fontFamily: 'inter', fontSize: 'md' },
    },
    {
      id: 'q-improve',
      type: 'checkboxes',
      title: 'What could be improved next time?',
      description: 'Tick all that apply.',
      required: false,
      options: ['Schedule', 'Venue', 'Materials', 'Communication', 'Food and water'],
      scaleMax: 5,
      scaleMinLabel: '',
      scaleMaxLabel: '',
      typography: { fontFamily: 'inter', fontSize: 'md' },
    },
    {
      id: 'q-comments',
      type: 'paragraph',
      title: 'Any other comments?',
      description: '',
      required: false,
      options: [],
      scaleMax: 5,
      scaleMinLabel: '',
      scaleMaxLabel: '',
      typography: { fontFamily: 'inter', fontSize: 'md' },
    },
  ],
}

const participant = (
  id: string,
  firstName: string,
  lastName: string,
  email: string,
  department: string | null,
) => ({ id, firstName, lastName, email, department })

const MOCK_RESPONSES: EvaluationResponse[] = [
  {
    id: 'r-1',
    participant: participant('u-101', 'Maria', 'Santos', 'maria.santos@uclm.edu.ph', 'CCS'),
    event: 'Coastal Clean-Up Drive',
    submittedAt: '2026-09-17T10:12:00.000Z',
    rating: 5,
    status: 'complete',
    answers: {
      'q-rating': 5,
      'q-role': 'Logistics',
      'q-briefing': 5,
      'q-improve': ['Schedule'],
      'q-comments':
        'Well organised. The team leads were easy to find and the water station was a good call.',
    },
  },
  {
    id: 'r-2',
    participant: participant('u-102', 'John', 'Reyes', 'john.reyes@uclm.edu.ph', 'CBA'),
    event: 'Coastal Clean-Up Drive',
    submittedAt: '2026-09-17T10:40:00.000Z',
    rating: 4,
    status: 'complete',
    answers: {
      'q-rating': 4,
      'q-role': 'Registration desk',
      'q-briefing': 4,
      'q-improve': ['Materials', 'Communication'],
      'q-comments': 'We ran out of sign-in sheets by 8am. Otherwise smooth.',
    },
  },
  {
    id: 'r-3',
    participant: participant('u-103', 'Angela', 'Cruz', 'angela.cruz@uclm.edu.ph', 'CN'),
    event: 'Medical Outreach - Brgy. Looc',
    submittedAt: '2026-09-16T15:05:00.000Z',
    rating: 3,
    status: 'partial',
    answers: {
      'q-rating': 3,
      'q-role': 'Medical support',
      'q-briefing': 2,
      'q-improve': ['Venue', 'Communication', 'Food and water'],
      'q-comments': null,
    },
  },
  {
    id: 'r-4',
    participant: participant('u-104', 'Paolo', 'Villanueva', 'paolo.v@uclm.edu.ph', 'COE'),
    event: 'Medical Outreach - Brgy. Looc',
    submittedAt: '2026-09-16T15:32:00.000Z',
    rating: 5,
    status: 'complete',
    answers: {
      'q-rating': 5,
      'q-role': 'Crowd assistance',
      'q-briefing': 5,
      'q-improve': [],
      'q-comments': 'Nothing to add. Great experience.',
    },
  },
  {
    id: 'r-5',
    participant: participant('u-105', 'Kristine', 'Dela Pena', 'kristine.dp@uclm.edu.ph', 'CCS'),
    event: 'Tree Planting - Cantipla',
    submittedAt: '2026-09-14T08:50:00.000Z',
    rating: 4,
    status: 'complete',
    answers: {
      'q-rating': 4,
      'q-role': 'Logistics',
      'q-briefing': 4,
      'q-improve': ['Schedule', 'Food and water'],
      'q-comments': 'Start time could be earlier to beat the heat.',
    },
  },
  {
    id: 'r-6',
    participant: participant('u-106', 'Miguel', 'Torres', 'miguel.torres@uclm.edu.ph', 'CAS'),
    event: 'Tree Planting - Cantipla',
    submittedAt: '2026-09-14T09:10:00.000Z',
    rating: 2,
    status: 'partial',
    answers: {
      'q-rating': 2,
      'q-role': 'Crowd assistance',
      'q-briefing': 2,
      'q-improve': ['Materials', 'Communication'],
      'q-comments': null,
    },
  },
  {
    id: 'r-7',
    participant: participant('u-107', 'Bea', 'Lim', 'bea.lim@uclm.edu.ph', 'CN'),
    event: 'Coastal Clean-Up Drive',
    submittedAt: '2026-09-17T11:02:00.000Z',
    rating: 5,
    status: 'complete',
    answers: {
      'q-rating': 5,
      'q-role': 'Medical support',
      'q-briefing': 5,
      'q-improve': [],
      'q-comments': 'The briefing the night before made a big difference.',
    },
  },
  {
    id: 'r-8',
    participant: participant('u-108', 'Rafael', 'Go', 'rafael.go@uclm.edu.ph', 'CBA'),
    event: 'Feeding Program - Mandaue',
    submittedAt: '2026-09-12T13:20:00.000Z',
    rating: 4,
    status: 'complete',
    answers: {
      'q-rating': 4,
      'q-role': 'Registration desk',
      'q-briefing': 3,
      'q-improve': ['Venue'],
      'q-comments': 'Queue management was tight but we managed.',
    },
  },
  {
    id: 'r-9',
    participant: participant('u-109', 'Camille', 'Ong', 'camille.ong@uclm.edu.ph', 'COE'),
    event: 'Feeding Program - Mandaue',
    submittedAt: '2026-09-12T13:45:00.000Z',
    rating: 3,
    status: 'complete',
    answers: {
      'q-rating': 3,
      'q-role': 'Logistics',
      'q-briefing': 3,
      'q-improve': ['Schedule', 'Materials'],
      'q-comments': 'Supplies arrived late.',
    },
  },
  {
    id: 'r-10',
    participant: participant('u-110', 'Daniel', 'Bautista', 'daniel.b@uclm.edu.ph', null),
    event: 'Coastal Clean-Up Drive',
    submittedAt: '2026-09-17T11:30:00.000Z',
    rating: 1,
    status: 'partial',
    answers: {
      'q-rating': 1,
      'q-role': null,
      'q-briefing': 1,
      'q-improve': ['Communication'],
      'q-comments': null,
    },
  },
]

/** Simulated round-trip so the skeletons are exercised the way a real fetch would. */
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function getEvaluationForm() {
  await wait(300)
  return { success: true, data: structuredClone(MOCK_FORM), message: undefined }
}

export async function saveEvaluationForm(form: EvaluationForm) {
  await wait(400)
  return {
    success: true,
    data: { ...structuredClone(form), updatedAt: new Date().toISOString() },
    message: 'Questionnaire saved',
  }
}

export async function listEvaluationResponses() {
  await wait(300)
  return { success: true, data: structuredClone(MOCK_RESPONSES), message: undefined }
}
