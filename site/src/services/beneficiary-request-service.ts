import { MOCK_API_DELAY_MS, delay } from '../constants/durations'
import type { BeneficiaryRequest } from '../types/beneficiary-request'

/**
 * The beneficiary-request endpoints are not built yet, so this module serves a
 * fixture queue and keeps decisions in memory. Swap each function for an `apiClient`
 * call — the signatures already match what the endpoint will return.
 */

const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

const seed: BeneficiaryRequest[] = [
  {
    id: 'br-1',
    reference: 'REQ-007',
    type: 'verification_proof',
    status: 'pending',
    submitter: {
      name: 'Marilou Estrada',
      email: 'marilou.estrada@example.com',
      barangay: 'Barangay Guadalupe',
    },
    summary: 'Submitted a barangay certificate and valid ID for beneficiary verification.',
    submittedAt: hoursAgo(3),
    attachments: [
      {
        id: 'br-1-a1',
        label: 'Barangay certificate',
        fileName: 'barangay-certificate.pdf',
        sizeBytes: 412_000,
      },
      {
        id: 'br-1-a2',
        label: 'Valid ID (front)',
        fileName: 'umid-front.jpg',
        sizeBytes: 1_240_000,
      },
    ],
    trail: [
      {
        id: 'br-1-t1',
        label: 'Request submitted from the volunteer app',
        actor: 'Marilou Estrada',
        at: hoursAgo(3),
      },
    ],
  },
  {
    id: 'br-2',
    reference: 'REQ-006',
    type: 'medical_assistance',
    status: 'pending',
    submitter: {
      name: 'Danilo Ravelo',
      email: 'danilo.ravelo@example.com',
      barangay: 'Barangay Lorega',
    },
    summary: 'Requesting medical assistance with hospital billing and prescription attached.',
    submittedAt: hoursAgo(9),
    attachments: [
      {
        id: 'br-2-a1',
        label: 'Hospital statement',
        fileName: 'hospital-billing.pdf',
        sizeBytes: 688_000,
      },
    ],
    trail: [
      {
        id: 'br-2-t1',
        label: 'Request submitted from the volunteer app',
        actor: 'Danilo Ravelo',
        at: hoursAgo(9),
      },
      {
        id: 'br-2-t2',
        label: 'Attachments checked for completeness',
        actor: 'Coordinator Jane Uy',
        at: hoursAgo(7),
      },
    ],
  },
  {
    id: 'br-3',
    reference: 'REQ-005',
    type: 'residency_proof',
    status: 'pending',
    submitter: {
      name: 'Cristina Alcantara',
      email: 'cristina.alcantara@example.com',
      barangay: 'Barangay Tisa',
    },
    summary: 'Proof of residency for a household that moved within the service area.',
    submittedAt: hoursAgo(28),
    attachments: [
      {
        id: 'br-3-a1',
        label: 'Utility bill',
        fileName: 'water-bill-june.jpg',
        sizeBytes: 902_000,
      },
    ],
    trail: [
      {
        id: 'br-3-t1',
        label: 'Request submitted from the volunteer app',
        actor: 'Cristina Alcantara',
        at: hoursAgo(28),
      },
    ],
  },
  {
    id: 'br-4',
    reference: 'REQ-004',
    type: 'income_proof',
    status: 'accepted',
    submitter: {
      name: 'Rogelio Bacus',
      email: 'rogelio.bacus@example.com',
      barangay: 'Barangay Labangon',
    },
    summary: 'Certificate of indigency submitted to support the income bracket claim.',
    submittedAt: hoursAgo(52),
    decidedAt: hoursAgo(50),
    decidedBy: 'Director Alma Sarmiento',
    attachments: [
      {
        id: 'br-4-a1',
        label: 'Certificate of indigency',
        fileName: 'indigency.pdf',
        sizeBytes: 320_000,
      },
    ],
    trail: [
      {
        id: 'br-4-t1',
        label: 'Request submitted from the volunteer app',
        actor: 'Rogelio Bacus',
        at: hoursAgo(52),
      },
      {
        id: 'br-4-t2',
        label: 'Request accepted — household added as beneficiary',
        actor: 'Director Alma Sarmiento',
        at: hoursAgo(50),
      },
    ],
  },
  {
    id: 'br-5',
    reference: 'REQ-003',
    type: 'household_update',
    status: 'deleted',
    submitter: {
      name: 'Jomar Paquibot',
      email: 'jomar.paquibot@example.com',
      barangay: 'Barangay Mambaling',
    },
    summary: 'Household size update filed twice — this copy duplicates REQ-002.',
    submittedAt: hoursAgo(74),
    decidedAt: hoursAgo(70),
    decidedBy: 'Director Alma Sarmiento',
    attachments: [],
    trail: [
      {
        id: 'br-5-t1',
        label: 'Request submitted from the volunteer app',
        actor: 'Jomar Paquibot',
        at: hoursAgo(74),
      },
      {
        id: 'br-5-t2',
        label: 'Request removed as a duplicate',
        actor: 'Director Alma Sarmiento',
        at: hoursAgo(70),
      },
    ],
  },
]

let requests: BeneficiaryRequest[] = structuredClone(seed)

export async function fetchBeneficiaryRequests(): Promise<BeneficiaryRequest[]> {
  await delay(MOCK_API_DELAY_MS.default)
  return structuredClone(requests)
}

interface DecisionInput {
  id: string
  /** Portal account making the call — recorded on the trail entry. */
  actor: string
}

function applyDecision(
  { id, actor }: DecisionInput,
  status: BeneficiaryRequest['status'],
  label: string,
): BeneficiaryRequest[] {
  const now = new Date().toISOString()

  requests = requests.map((request) =>
    request.id === id
      ? {
          ...request,
          status,
          // A restored request is pending again, so it must not keep showing the
          // decision that put it in the bin.
          decidedAt: status === 'pending' ? undefined : now,
          decidedBy: status === 'pending' ? undefined : actor,
          trail: [
            ...request.trail,
            { id: `${request.id}-t${request.trail.length + 1}`, label, actor, at: now },
          ],
        }
      : request,
  )

  return structuredClone(requests)
}

export async function acceptBeneficiaryRequest(
  input: DecisionInput,
): Promise<BeneficiaryRequest[]> {
  await delay(MOCK_API_DELAY_MS.default)
  return applyDecision(input, 'accepted', 'Request accepted — household added as beneficiary')
}

export async function deleteBeneficiaryRequest(
  input: DecisionInput,
): Promise<BeneficiaryRequest[]> {
  await delay(MOCK_API_DELAY_MS.default)
  return applyDecision(input, 'deleted', 'Request removed from the review queue')
}

export async function restoreBeneficiaryRequest(
  input: DecisionInput,
): Promise<BeneficiaryRequest[]> {
  await delay(MOCK_API_DELAY_MS.default)
  return applyDecision(input, 'pending', 'Request restored to the review queue')
}
