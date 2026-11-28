import type { EventParticipationRole } from '../../infastructures/prisma/common/client';

/** Need approval; earn a bonus. Must match `PARTICIPATION_ROLE_OPTIONS` in `site/src/constants/ranking.ts`. */
export const SPECIAL_PARTICIPATION_ROLES = [
  'ORGANIZER',
  'FACILITATOR',
  'SPEAKER',
] as const satisfies readonly EventParticipationRole[];

export type SpecialParticipationRole =
  (typeof SPECIAL_PARTICIPATION_ROLES)[number];

/** Defaults; overridden by `RankingSettings.participation_role_points`. */
export const DEFAULT_PARTICIPATION_ROLE_POINTS: Record<
  SpecialParticipationRole,
  number
> = {
  ORGANIZER: 5,
  FACILITATOR: 5,
  SPEAKER: 10,
};
