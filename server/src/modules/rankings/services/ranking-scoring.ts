import type {
  AttendanceStatus,
  EventParticipationRole,
  EventRoleApproval,
} from '../../../infastructures/prisma/common/client';
import {
  SPECIAL_PARTICIPATION_ROLES,
  type SpecialParticipationRole,
} from '../../../shared/constants/participation-role-points';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The knobs Customization exposes; everything below is derived from them. */
export interface ScoringRule {
  pointsPerAttendance: number;
  absencePenaltyStep: number;
  absenceResetDays: number;
  /** Extra points per attended event, by approved role; a role left out earns none. */
  participationRolePoints: Partial<Record<EventParticipationRole, number>>;
}

/** One ruled attendance row, in the shape the scorer needs and nothing more. */
export interface ScoredAttendance {
  status: AttendanceStatus;
  /** When the event ended — the moment the ruling applies to. */
  endedAt: Date;
  hoursRendered: number | null;
  /** The role the volunteer registered for, and where its review stands. */
  participationRole: EventParticipationRole;
  roleApproval: EventRoleApproval;
}

export interface VolunteerScore {
  /** Attendance points plus role bonuses — everything earned before deductions. */
  pointsEarned: number;
  /** The share of `pointsEarned` that came from approved participation roles. */
  rolePoints: number;
  /** Attended events served in each approved special role. */
  roleCounts: Record<SpecialParticipationRole, number>;
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
 * - every attended event (COMPLETED) earns `pointsPerAttendance`, plus the
 *   `participationRolePoints` bonus for the role the volunteer took — only once
 *   that role was APPROVED; a pending or rejected role counts as Regular;
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
    rolePoints: 0,
    roleCounts: { ORGANIZER: 0, FACILITATOR: 0, SPEAKER: 0 },
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
      const bonus = participationRoleBonus(row, rule);
      score.pointsEarned += rule.pointsPerAttendance + bonus;
      score.rolePoints += bonus;
      if (
        row.roleApproval === 'APPROVED' &&
        isSpecialRole(row.participationRole)
      ) {
        score.roleCounts[row.participationRole] += 1;
      }
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

/**
 * The extra points one attended event earns for the volunteer's role. Zero for
 * Regular, and for any role still pending or rejected — the volunteer took part
 * as Regular then.
 */
export function participationRoleBonus(
  row: Pick<ScoredAttendance, 'participationRole' | 'roleApproval'>,
  rule: ScoringRule,
): number {
  if (row.roleApproval !== 'APPROVED') return 0;
  return rule.participationRolePoints[row.participationRole] ?? 0;
}

function isSpecialRole(
  role: EventParticipationRole,
): role is SpecialParticipationRole {
  return (SPECIAL_PARTICIPATION_ROLES as readonly string[]).includes(role);
}
