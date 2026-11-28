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

/** Customization's knobs; everything else derives from them. */
export interface ScoringRule {
  pointsPerAttendance: number;
  absencePenaltyStep: number;
  absenceResetDays: number;
  /** Per approved role; omitted roles earn none. */
  participationRolePoints: Partial<Record<EventParticipationRole, number>>;
}

export interface ScoredAttendance {
  status: AttendanceStatus;
  endedAt: Date;
  hoursRendered: number | null;
  participationRole: EventParticipationRole;
  roleApproval: EventRoleApproval;
}

export interface VolunteerScore {
  /** Before deductions. */
  pointsEarned: number;
  /** Portion of `pointsEarned` from approved roles. */
  rolePoints: number;
  roleCounts: Record<SpecialParticipationRole, number>;
  pointsDeducted: number;
  /** Floored at zero. */
  points: number;
  eventsAttended: number;
  eventsMissed: number;
  hours: number;
  /** Straight misses still counting as of `now`. */
  currentStreak: number;
  lastActiveAt: Date | null;
}

/**
 * - COMPLETED: `pointsPerAttendance` + `participationRolePoints` (APPROVED roles only).
 * - ABSENT: `absencePenaltyStep`, one step more per straight miss within `absenceResetDays` (−2, −4, −6 …);
 *   resets after a longer gap or an attended event.
 * - PENDING: nothing.
 * Rows are taken in event order, not ruling order.
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

  // Only counts while inside the window.
  score.currentStreak =
    lastMissAt !== null && now.getTime() - lastMissAt.getTime() <= resetMs
      ? streak
      : 0;
  score.points = Math.max(0, score.pointsEarned - score.pointsDeducted);
  return score;
}

/** Given the current streak. */
export function nextAbsencePenalty(
  currentStreak: number,
  rule: ScoringRule,
): number {
  return rule.absencePenaltyStep * (currentStreak + 1);
}

/** Zero for Regular and for pending or rejected roles. */
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
