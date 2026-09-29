import { resolveDepartmentScope } from '../../../shared/constants/departments';

/** The share of the score each criterion carries — hours and pesos weigh equally. */
const HOURS_WEIGHT = 50;
const DONATIONS_WEIGHT = 50;

/** What the department board needs from one ranked volunteer. */
export interface DepartmentVolunteerInput {
  department: string | null;
  hours: number;
  eventsAttended: number;
}

/** What the department board needs from one confirmed donation. */
export interface DepartmentDonationInput {
  /** The college of the event the gift went to; null for a school-wide event. */
  department: string | null;
  amount: number;
}

export interface DepartmentRanks {
  overall: number;
  hours: number;
  donations: number;
}

export interface RankedDepartment {
  key: string;
  name: string;
  code: string | null;
  volunteers: number;
  eventsAttended: number;
  hours: number;
  donationAmount: number;
  donations: number;
  score: number;
  ranks: DepartmentRanks;
}

export interface DepartmentBoard {
  entries: RankedDepartment[];
  unattributed: { hours: number; donationAmount: number };
}

/**
 * One college goes by many spellings (see `DEPARTMENT_ALIASES`), so rows are
 * grouped on the college code when the text maps to one, else on the text itself.
 */
function departmentKey(name: string): { key: string; code: string | null } {
  const { code } = resolveDepartmentScope(name);
  return code
    ? { key: code, code }
    : { key: name.trim().toLowerCase(), code: null };
}

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/**
 * Ranks every college on volunteer hours and on confirmed pesos, then on a
 * combined score. The two are on different scales — hours and pesos — so the
 * combined score adds up each college's *share* of the school's total of each,
 * which makes neither criterion drown the other out.
 *
 * Volunteers count toward the college on their school record; a donation counts
 * toward the college that ran the event it was given to. Anything with no college
 * is reported as unattributed rather than silently dropped.
 */
export function rankDepartments(
  departmentNames: string[],
  volunteers: DepartmentVolunteerInput[],
  donations: DepartmentDonationInput[],
): DepartmentBoard {
  const byKey = new Map<string, Omit<RankedDepartment, 'score' | 'ranks'>>();
  const unattributed = { hours: 0, donationAmount: 0 };

  const bucketFor = (rawName: string | null) => {
    const name = rawName?.trim();
    if (!name) return null;
    const { key, code } = departmentKey(name);
    const existing = byKey.get(key);
    if (existing) return existing;
    const bucket = {
      key,
      name,
      code,
      volunteers: 0,
      eventsAttended: 0,
      hours: 0,
      donationAmount: 0,
      donations: 0,
    };
    byKey.set(key, bucket);
    return bucket;
  };

  // The school's own list goes in first, so a college with nothing yet still
  // shows — and its registered spelling is the one displayed.
  for (const name of departmentNames) bucketFor(name);

  for (const volunteer of volunteers) {
    const bucket = bucketFor(volunteer.department);
    if (!bucket) {
      unattributed.hours += volunteer.hours;
      continue;
    }
    bucket.volunteers += 1;
    bucket.eventsAttended += volunteer.eventsAttended;
    bucket.hours += volunteer.hours;
  }

  for (const donation of donations) {
    const bucket = bucketFor(donation.department);
    if (!bucket) {
      unattributed.donationAmount += donation.amount;
      continue;
    }
    bucket.donationAmount += donation.amount;
    bucket.donations += 1;
  }

  const buckets = [...byKey.values()];
  const totalHours = buckets.reduce((sum, entry) => sum + entry.hours, 0);
  const totalAmount = buckets.reduce(
    (sum, entry) => sum + entry.donationAmount,
    0,
  );

  const scored = buckets.map((entry) => ({
    ...entry,
    hours: round(entry.hours),
    score: round(
      (totalHours > 0 ? (entry.hours / totalHours) * HOURS_WEIGHT : 0) +
        (totalAmount > 0
          ? (entry.donationAmount / totalAmount) * DONATIONS_WEIGHT
          : 0),
      1,
    ),
  }));

  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name);
  const rankOf = (
    compare: (a: (typeof scored)[number], b: (typeof scored)[number]) => number,
  ) =>
    new Map(
      [...scored]
        .sort((a, b) => compare(a, b) || byName(a, b))
        .map((entry, index) => [entry.key, index + 1]),
    );

  const overall = rankOf(
    (a, b) =>
      b.score - a.score ||
      b.hours - a.hours ||
      b.donationAmount - a.donationAmount,
  );
  const hours = rankOf(
    (a, b) => b.hours - a.hours || b.volunteers - a.volunteers,
  );
  const donationRanks = rankOf(
    (a, b) => b.donationAmount - a.donationAmount || b.donations - a.donations,
  );

  const entries = scored
    .map((entry) => ({
      ...entry,
      ranks: {
        overall: overall.get(entry.key) ?? 0,
        hours: hours.get(entry.key) ?? 0,
        donations: donationRanks.get(entry.key) ?? 0,
      },
    }))
    .sort((a, b) => a.ranks.overall - b.ranks.overall);

  return {
    entries,
    unattributed: {
      hours: round(unattributed.hours),
      donationAmount: unattributed.donationAmount,
    },
  };
}
