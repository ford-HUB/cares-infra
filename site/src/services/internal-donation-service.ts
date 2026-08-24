import dayjs from 'dayjs'
import { MOCK_API_DELAY_MS, delay } from '../constants/durations'
import {
  DONATION_MAIL_SUBJECTS,
  DONATION_STATUS_LABELS,
  formatDonationReference,
} from '../constants/internal-donation'
import type {
  DonationStatus,
  DonationTimelineEntry,
  InternalDonation,
} from '../types/internal-donation'

/**
 * The internal-donation endpoints are not built yet, so this module serves fixtures
 * and keeps mutations in memory. Swap each function for an `apiClient` call — the
 * signatures already match what the endpoint will return. The donor notice is a
 * console line here; on the server it becomes the mail send.
 */

const now = dayjs()

function stamp(daysAgo: number, hour: number): string {
  return now.subtract(daysAgo, 'day').hour(hour).minute(0).second(0).toISOString()
}

function entry(
  id: string,
  status: DonationStatus,
  actor: string,
  at: string,
  note?: string,
  notifiedEmail?: string,
): DonationTimelineEntry {
  return { id, status, actor, at, note, notifiedEmail }
}

const seed: InternalDonation[] = [
  {
    id: 'don-1',
    reference: formatDonationReference(1),
    kind: 'money',
    status: 'verifying',
    donor: {
      name: 'Maria Fe Alcantara',
      email: 'mfalcantara@gmail.com',
      phone: '+63 917 220 1145',
      type: 'Alumni',
    },
    eventId: 'evt-relief-01',
    eventTitle: 'Typhoon Relief Drive — Brgy. Mabolo',
    createdAt: stamp(2, 9),
    updatedAt: stamp(1, 14),
    amount: 15000,
    method: 'GCash',
    paymentReference: 'GC-88213094',
    timeline: [
      entry('t-1a', 'pledged', 'System', stamp(2, 9), 'Donor submitted the transfer', 'mfalcantara@gmail.com'),
      entry('t-1b', 'verifying', 'Dir. Villanueva', stamp(1, 14), 'Matching against the GCash statement', 'mfalcantara@gmail.com'),
    ],
  },
  {
    id: 'don-2',
    reference: formatDonationReference(2),
    kind: 'money',
    status: 'confirmed',
    donor: {
      name: 'Cebu Pacific Foundation',
      email: 'giving@cebupacfoundation.org',
      type: 'Company',
    },
    eventId: 'evt-feed-02',
    eventTitle: 'Feeding Program — Pasil Elementary',
    createdAt: stamp(9, 10),
    updatedAt: stamp(6, 11),
    amount: 50000,
    method: 'Bank Transfer',
    paymentReference: 'BPI-4471209',
    timeline: [
      entry('t-2a', 'pledged', 'System', stamp(9, 10), undefined, 'giving@cebupacfoundation.org'),
      entry('t-2b', 'verifying', 'Ms. Reyes', stamp(7, 9), 'Deposit slip received', 'giving@cebupacfoundation.org'),
      entry('t-2c', 'confirmed', 'Dir. Villanueva', stamp(6, 11), 'Credited to the feeding-program fund', 'giving@cebupacfoundation.org'),
    ],
  },
  {
    id: 'don-3',
    reference: formatDonationReference(3),
    kind: 'money',
    status: 'pledged',
    donor: {
      name: 'Rogelio Tan',
      email: 'rogelio.tan@yahoo.com',
      phone: '+63 932 887 0031',
      type: 'Individual',
    },
    eventId: 'evt-school-03',
    eventTitle: 'Back-to-School Supplies Drive',
    createdAt: stamp(0, 8),
    updatedAt: stamp(0, 8),
    amount: 3500,
    method: 'Cash',
    timeline: [
      entry('t-3a', 'pledged', 'System', stamp(0, 8), 'Will hand over at the CARES office', 'rogelio.tan@yahoo.com'),
    ],
  },
  {
    id: 'don-4',
    reference: formatDonationReference(4),
    kind: 'goods',
    status: 'awaiting_pickup',
    donor: {
      name: 'UCLM Nursing Society',
      email: 'nursingsociety@uclm.edu.ph',
      type: 'Student Org',
    },
    eventId: 'evt-relief-01',
    eventTitle: 'Typhoon Relief Drive — Brgy. Mabolo',
    createdAt: stamp(1, 13),
    updatedAt: stamp(0, 10),
    amount: 12000,
    dropOffLocation: 'CARES Office, UCLM Main Campus',
    items: [
      { name: 'Rice', quantity: 10, unit: 'sacks' },
      { name: 'Canned goods', quantity: 8, unit: 'boxes' },
      { name: 'Bottled water', quantity: 20, unit: 'cases' },
    ],
    timeline: [
      entry('t-4a', 'pledged', 'System', stamp(1, 13), undefined, 'nursingsociety@uclm.edu.ph'),
      entry('t-4b', 'awaiting_pickup', 'Ms. Reyes', stamp(0, 10), 'Dropped at the CARES office lobby', 'nursingsociety@uclm.edu.ph'),
    ],
  },
  {
    id: 'don-5',
    reference: formatDonationReference(5),
    kind: 'goods',
    status: 'verifying',
    donor: {
      name: 'Barangay Apas Council',
      email: 'apascouncil@gmail.com',
      phone: '+63 906 445 2210',
      type: 'Barangay',
    },
    eventId: 'evt-feed-02',
    eventTitle: 'Feeding Program — Pasil Elementary',
    createdAt: stamp(4, 9),
    updatedAt: stamp(2, 15),
    amount: 7800,
    dropOffLocation: 'CARES Warehouse, Brgy. Apas',
    items: [
      { name: 'School supplies packs', quantity: 60, unit: 'pcs' },
      { name: 'Powdered milk', quantity: 4, unit: 'boxes' },
    ],
    timeline: [
      entry('t-5a', 'pledged', 'System', stamp(4, 9), undefined, 'apascouncil@gmail.com'),
      entry('t-5b', 'awaiting_pickup', 'Mr. Lozada', stamp(3, 8), undefined, 'apascouncil@gmail.com'),
      entry('t-5c', 'verifying', 'Mr. Lozada', stamp(2, 15), 'Counting packs against the pledge list', 'apascouncil@gmail.com'),
    ],
  },
  {
    id: 'don-6',
    reference: formatDonationReference(6),
    kind: 'goods',
    status: 'confirmed',
    donor: {
      name: 'Sto. Niño Parish',
      email: 'office@stoninoparish.ph',
      type: 'Partner',
    },
    eventId: 'evt-senior-04',
    eventTitle: 'Senior Citizens Outreach',
    createdAt: stamp(12, 8),
    updatedAt: stamp(8, 16),
    amount: 22000,
    dropOffLocation: 'CARES Office, UCLM Main Campus',
    items: [
      { name: 'Blankets', quantity: 120, unit: 'pcs' },
      { name: 'Hygiene kits', quantity: 90, unit: 'pcs' },
    ],
    timeline: [
      entry('t-6a', 'pledged', 'System', stamp(12, 8), undefined, 'office@stoninoparish.ph'),
      entry('t-6b', 'awaiting_pickup', 'Ms. Reyes', stamp(11, 9), undefined, 'office@stoninoparish.ph'),
      entry('t-6c', 'verifying', 'Ms. Reyes', stamp(10, 14), undefined, 'office@stoninoparish.ph'),
      entry('t-6d', 'confirmed', 'Dir. Villanueva', stamp(8, 16), 'All 210 items received in good condition', 'office@stoninoparish.ph'),
    ],
  },
  {
    id: 'don-7',
    reference: formatDonationReference(7),
    kind: 'goods',
    status: 'pledged',
    donor: {
      name: 'Anne Marquez',
      email: 'anne.marquez@outlook.com',
      type: 'Individual',
    },
    eventId: 'evt-school-03',
    eventTitle: 'Back-to-School Supplies Drive',
    createdAt: stamp(0, 11),
    updatedAt: stamp(0, 11),
    amount: 4500,
    dropOffLocation: 'CARES Office, UCLM Main Campus',
    items: [{ name: 'Notebooks', quantity: 200, unit: 'pcs' }],
    timeline: [
      entry('t-7a', 'pledged', 'System', stamp(0, 11), 'Bringing them over this Friday', 'anne.marquez@outlook.com'),
    ],
  },
  {
    id: 'don-8',
    reference: formatDonationReference(8),
    kind: 'money',
    status: 'declined',
    donor: {
      name: 'Jose Enriquez',
      email: 'jose.enriquez@gmail.com',
      type: 'Individual',
    },
    eventId: 'evt-senior-04',
    eventTitle: 'Senior Citizens Outreach',
    createdAt: stamp(15, 10),
    updatedAt: stamp(13, 9),
    amount: 2000,
    method: 'GCash',
    paymentReference: 'GC-77120043',
    timeline: [
      entry('t-8a', 'pledged', 'System', stamp(15, 10), undefined, 'jose.enriquez@gmail.com'),
      entry('t-8b', 'verifying', 'Ms. Reyes', stamp(14, 11), undefined, 'jose.enriquez@gmail.com'),
      entry('t-8c', 'declined', 'Dir. Villanueva', stamp(13, 9), 'No matching transfer found after two weeks', 'jose.enriquez@gmail.com'),
    ],
  },
]

let donations: InternalDonation[] = structuredClone(seed)

export async function fetchInternalDonations(): Promise<InternalDonation[]> {
  await delay(MOCK_API_DELAY_MS.default)
  return structuredClone(donations)
}

export interface DonationStatusChange {
  status: DonationStatus
  /** Added to the timeline and to the donor's notice. */
  note?: string
  /** Portal account making the move. */
  actor: string
}

export interface DonationStatusChangeResult {
  donations: InternalDonation[]
  /** Address the notice went to, so the caller can say so in the toast. */
  notifiedEmail: string
}

/**
 * Moves a donation and notifies the donor in the same step — the two are one action,
 * never two: a status the donor was not told about is the failure this page exists to
 * prevent.
 */
export async function advanceDonationStatus(
  id: string,
  change: DonationStatusChange,
): Promise<DonationStatusChangeResult> {
  await delay(MOCK_API_DELAY_MS.default)

  const target = donations.find((donation) => donation.id === id)
  if (!target) throw new Error('Donation not found')

  const at = new Date().toISOString()
  const note = change.note?.trim() || undefined

  donations = donations.map((donation) =>
    donation.id === id
      ? {
          ...donation,
          status: change.status,
          updatedAt: at,
          timeline: [
            ...donation.timeline,
            {
              id: `t-${donation.id}-${donation.timeline.length + 1}`,
              status: change.status,
              note,
              actor: change.actor,
              at,
              notifiedEmail: donation.donor.email,
            },
          ],
        }
      : donation,
  )

  sendDonorStatusMail(target.donor.email, target.reference, change.status, note)

  return {
    donations: structuredClone(donations),
    notifiedEmail: target.donor.email,
  }
}

/** Stand-in for the server's mail send; replaced when the endpoint lands. */
function sendDonorStatusMail(
  to: string,
  reference: string,
  status: DonationStatus,
  note?: string,
): void {
  const body = `Donation ${reference} is now "${DONATION_STATUS_LABELS[status]}".${
    note ? ` ${note}` : ''
  }`
  console.info('[donation-mail]', to, DONATION_MAIL_SUBJECTS[status], body)
}
