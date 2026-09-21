import { z } from 'zod'
import {
  DONOR_PESOS_PER_POINT_MAX,
  DONOR_PESOS_PER_POINT_MIN,
  RANKING_DEFAULT_SETTINGS,
  RANKING_TIER_LABEL_MAX,
  RANKING_TIER_MAX_COUNT,
  RANKING_TIER_MIN_COUNT,
  VOLUNTEER_ABSENCE_PENALTY_STEP_MAX,
  VOLUNTEER_ABSENCE_PENALTY_STEP_MIN,
  VOLUNTEER_ABSENCE_RESET_DAYS_MAX,
  VOLUNTEER_ABSENCE_RESET_DAYS_MIN,
  VOLUNTEER_POINTS_PER_ATTENDANCE_MAX,
  VOLUNTEER_POINTS_PER_ATTENDANCE_MIN,
} from '../constants/ranking'
import { HEX_COLOR_PATTERN, RANK_FRAME_IDS } from '../constants/rank-frames'

const wholeNumber = (min: number, max: number, label: string) =>
  z
    .number({ message: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must not exceed ${max}`)

/**
 * The last tier catches everyone below the ones above it, so its cut-off is not
 * editable — only the tiers above it carry a rank ceiling.
 */
const hexColor = (label: string) =>
  z
    .string()
    .trim()
    .regex(HEX_COLOR_PATTERN, `${label} must be a six-digit hex colour, e.g. #F97316`)

/**
 * A cut-off is a whole rank, except on the catch-all, which is stored as
 * `Number.POSITIVE_INFINITY` — Zod 4's `z.number()` rejects non-finite values, so
 * that case is allowed for explicitly.
 */
const maxRank = z.custom<number>(
  (value) =>
    value === Number.POSITIVE_INFINITY ||
    (typeof value === 'number' && Number.isInteger(value) && value >= 1),
  { message: 'Cut-off must be a whole rank of at least 1' },
)

const tierSchema = z.object({
  id: z.string(),
  label: z
    .string()
    .trim()
    .min(1, 'Tier name is required')
    .max(RANKING_TIER_LABEL_MAX, `Tier name must not exceed ${RANKING_TIER_LABEL_MAX} characters`),
  maxRank,
  /** The badge design preset — the ornament, with no colour of its own. */
  frame: z.enum(RANK_FRAME_IDS),
  colorFrom: hexColor('Gradient start'),
  colorTo: hexColor('Gradient end'),
})

export const rankingCustomizationSchema = z
  .object({
    pointsPerAttendance: wholeNumber(
      VOLUNTEER_POINTS_PER_ATTENDANCE_MIN,
      VOLUNTEER_POINTS_PER_ATTENDANCE_MAX,
      'Points per attendance',
    ),
    absencePenaltyStep: wholeNumber(
      VOLUNTEER_ABSENCE_PENALTY_STEP_MIN,
      VOLUNTEER_ABSENCE_PENALTY_STEP_MAX,
      'Absence penalty',
    ),
    absenceResetDays: wholeNumber(
      VOLUNTEER_ABSENCE_RESET_DAYS_MIN,
      VOLUNTEER_ABSENCE_RESET_DAYS_MAX,
      'Streak window',
    ),
    donorPesosPerPoint: wholeNumber(
      DONOR_PESOS_PER_POINT_MIN,
      DONOR_PESOS_PER_POINT_MAX,
      'Pesos per point',
    ),
    defaultBoard: z.enum(['volunteer', 'donor']),
    defaultPeriod: z.enum(['month', 'quarter', 'year', 'all']),
    tiers: z
      .array(tierSchema)
      .min(RANKING_TIER_MIN_COUNT, `A ladder needs at least ${RANKING_TIER_MIN_COUNT} tiers`)
      .max(RANKING_TIER_MAX_COUNT, `A ladder can hold at most ${RANKING_TIER_MAX_COUNT} tiers`),
  })
  .refine(
    ({ tiers }) =>
      tiers.every(
        (tier, index) => index === 0 || tier.maxRank > tiers[index - 1].maxRank,
      ),
    {
      path: ['tiers'],
      message: 'Each tier must end at a lower standing than the one below it',
    },
  )

export type RankingCustomizationFormValues = z.infer<typeof rankingCustomizationSchema>

export const rankingCustomizationDefaultValues: RankingCustomizationFormValues =
  RANKING_DEFAULT_SETTINGS
