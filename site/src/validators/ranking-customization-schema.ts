import { z } from 'zod'
import {
  DONOR_PESOS_PER_POINT_MAX,
  DONOR_PESOS_PER_POINT_MIN,
  RANKING_DEFAULT_SETTINGS,
  RANKING_TIER_LABEL_MAX,
  RANKING_TIER_MAX_COUNT,
  RANKING_TIER_MIN_COUNT,
  VOLUNTEER_POINTS_PER_HOUR_MAX,
  VOLUNTEER_POINTS_PER_HOUR_MIN,
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

const tierSchema = z.object({
  id: z.string(),
  label: z
    .string()
    .trim()
    .min(1, 'Tier name is required')
    .max(RANKING_TIER_LABEL_MAX, `Tier name must not exceed ${RANKING_TIER_LABEL_MAX} characters`),
  maxRank: z.number(),
  /** The badge design preset — the ornament, with no colour of its own. */
  frame: z.enum(RANK_FRAME_IDS),
  colorFrom: hexColor('Gradient start'),
  colorTo: hexColor('Gradient end'),
})

export const rankingCustomizationSchema = z
  .object({
    volunteerPointsPerHour: wholeNumber(
      VOLUNTEER_POINTS_PER_HOUR_MIN,
      VOLUNTEER_POINTS_PER_HOUR_MAX,
      'Points per service hour',
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
