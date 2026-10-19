import type { EventParticipationRole } from '../../infastructures/prisma/common/client';

/**
 * The event roles that need a director's or coordinator's approval and, once
 * approved, earn a bonus on top of the attendance points. REGULAR is the plain
 * slot and never carries one. Mirrors the portal's `PARTICIPATION_ROLE_OPTIONS`
 * in `site/src/constants/ranking.ts`.
 */
export const SPECIAL_PARTICIPATION_ROLES = [
  'ORGANIZER',
  'FACILITATOR',
  'SPEAKER',
] as const satisfies readonly EventParticipationRole[];

export type SpecialParticipationRole =
  (typeof SPECIAL_PARTICIPATION_ROLES)[number];

/**
 * Extra points per attended event, by approved role. The shipped defaults;
 * Rankings → Customization overrides them in
 * `RankingSettings.participation_role_points`.
 */
export const DEFAULT_PARTICIPATION_ROLE_POINTS: Record<
  SpecialParticipationRole,
  number
> = {
  ORGANIZER: 5,
  FACILITATOR: 5,
  SPEAKER: 10,
};
