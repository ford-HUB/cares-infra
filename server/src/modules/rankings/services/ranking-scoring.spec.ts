import {
  nextAbsencePenalty,
  scoreAttendance,
  type ScoredAttendance,
} from './ranking-scoring';

const RULE = {
  pointsPerAttendance: 10,
  absencePenaltyStep: 2,
  absenceResetDays: 7,
};
const NOW = new Date('2026-09-21T12:00:00Z');

function day(offset: number): Date {
  return new Date(NOW.getTime() - offset * 24 * 60 * 60 * 1000);
}

function attended(daysAgo: number, hours = 4): ScoredAttendance {
  return {
    status: 'COMPLETED',
    endedAt: day(daysAgo),
    hoursRendered: hours,
  };
}

function missed(daysAgo: number): ScoredAttendance {
  return {
    status: 'ABSENT',
    endedAt: day(daysAgo),
    hoursRendered: null,
  };
}

describe('scoreAttendance', () => {
  it('earns points per attended event', () => {
    const score = scoreAttendance([attended(10), attended(3)], RULE, NOW);
    expect(score.pointsEarned).toBe(20);
    expect(score.pointsDeducted).toBe(0);
    expect(score.points).toBe(20);
    expect(score.eventsAttended).toBe(2);
    expect(score.hours).toBe(8);
    expect(score.lastActiveAt).toEqual(day(3));
  });

  it('escalates the penalty for straight misses inside the window', () => {
    // −2, −4, −6 over three misses two days apart.
    const score = scoreAttendance([missed(6), missed(4), missed(2)], RULE, NOW);
    expect(score.pointsDeducted).toBe(12);
    expect(score.eventsMissed).toBe(3);
    expect(score.currentStreak).toBe(3);
    expect(nextAbsencePenalty(score.currentStreak, RULE)).toBe(8);
  });

  it('resets the escalation once a week has passed since the last miss', () => {
    const score = scoreAttendance([missed(20), missed(2)], RULE, NOW);
    expect(score.pointsDeducted).toBe(4);
    expect(score.currentStreak).toBe(1);
  });

  it('resets the escalation when an event is attended in between', () => {
    const score = scoreAttendance(
      [missed(6), attended(4), missed(2)],
      RULE,
      NOW,
    );
    expect(score.pointsEarned).toBe(10);
    expect(score.pointsDeducted).toBe(4);
    expect(score.points).toBe(6);
  });

  it('scores rows in event order regardless of input order', () => {
    const score = scoreAttendance([missed(2), missed(4), missed(6)], RULE, NOW);
    expect(score.pointsDeducted).toBe(12);
  });

  it('never reports a negative standing and ignores pending rows', () => {
    const score = scoreAttendance(
      [
        missed(3),
        {
          status: 'PENDING',
          endedAt: day(1),
          hoursRendered: null,
        },
      ],
      RULE,
      NOW,
    );
    expect(score.points).toBe(0);
    expect(score.pointsDeducted).toBe(2);
    expect(score.eventsAttended).toBe(0);
  });

  it('drops the streak once the window has passed as of now', () => {
    const score = scoreAttendance([missed(12), missed(10)], RULE, NOW);
    expect(score.pointsDeducted).toBe(6);
    expect(score.currentStreak).toBe(0);
    expect(nextAbsencePenalty(score.currentStreak, RULE)).toBe(2);
  });
});
