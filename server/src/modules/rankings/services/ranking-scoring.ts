import type { AttendanceStatus } from '../../../infastructures/prisma/common/client';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The knobs Customization exposes; everything below is derived from them. */
export interface ScoringRule {
  pointsPerAttendance: number;
  absencePenaltyStep: number;
  absenceResetDays: number;
}

/** One ruled attendance row, in the shape the scorer needs and nothing more. */
export interface ScoredAttendance {
  status: AttendanceStatus;
  /** When the event ended — the moment the ruling applies to. */
  endedAt: Date;
  hoursRendered: number | null;
}

export interface VolunteerScore {
  pointsEarned: number;
  pointsDeducted: number;
  /** Earned minus deducted, floored at zero so a standing never reads negative. */
  points: number;
  eventsAttended: number;
  eventsMissed: number;
  hours: number;
  /** Straight misses still counting against the next one as of `now`. */
  currentStreak: number;
  lastActiveAt: Date | null;
}

/**
 * The volunteer scoring mechanic:
 *
 * - every attended event (COMPLETED) earns `pointsPerAttendance`;
 * - a registered event the volunteer skipped (ABSENT) costs `absencePenaltyStep`
 *   the first time, and each straight miss within `absenceResetDays` of the last
 *   one costs one step more — −2, −4, −6 …;
 * - the escalation resets to the first step once a miss is more than a week
 *   after the previous one, or once the volunteer attends something in between;
 * - rows still PENDING (unruled, awaiting sync) count for nothing either way.
 *
 * Rows are taken in event order, so the streak follows the calendar and not the
 * order the validator happened to rule in.
 */
export function scoreAttendance(
  rows: ScoredAttendance[],
  rule: ScoringRule,
  now: Date,
): VolunteerScore {
  const ordered = [...rows].sort(
    (a, b) => a.endedAt.getTime() - b.endedAt.getTime(),
  );
  const resetMs = rule.absenceResetDays * DAY_MS;

  const score: VolunteerScore = {
    pointsEarned: 0,
    pointsDeducted: 0,
    points: 0,
    eventsAttended: 0,
    eventsMissed: 0,
    hours: 0,
    currentStreak: 0,
    lastActiveAt: null,
  };
  let streak = 0;
  let lastMissAt: Date | null = null;

  for (const row of ordered) {
    if (row.status === 'COMPLETED') {
      score.pointsEarned += rule.pointsPerAttendance;
      score.eventsAttended += 1;
      score.hours += row.hoursRendered ?? 0;
      score.lastActiveAt = row.endedAt;
      streak = 0;
      lastMissAt = null;
      continue;
    }
    if (row.status !== 'ABSENT') continue;

    const straight =
      lastMissAt !== null &&
      row.endedAt.getTime() - lastMissAt.getTime() <= resetMs;
    streak = straight ? streak + 1 : 1;
    score.pointsDeducted += rule.absencePenaltyStep * streak;
    score.eventsMissed += 1;
    lastMissAt = row.endedAt;
  }

  // A streak only threatens the next event while it is still inside the window.
  score.currentStreak =
    lastMissAt !== null && now.getTime() - lastMissAt.getTime() <= resetMs
      ? streak
      : 0;
  score.points = Math.max(0, score.pointsEarned - score.pointsDeducted);
  return score;
}

/** What one more miss would cost right now, given the streak in progress. */
export function nextAbsencePenalty(
  currentStreak: number,
  rule: ScoringRule,
): number {
  return rule.absencePenaltyStep * (currentStreak + 1);
}
