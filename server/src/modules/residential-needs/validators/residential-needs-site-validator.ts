import { z } from 'zod';

/** Q1 choices on the Beneficiary Needs Assessment survey. */
export const NEED_CATEGORIES = [
  'food',
  'healthcare',
  'education',
  'livelihood',
  'financial',
  'other',
] as const;

/** The named categories the model clusters on — "other" is free text. */
export const CLUSTER_NEEDS = [
  'food',
  'healthcare',
  'education',
  'livelihood',
  'financial',
] as const;

export const NEED_BARRIERS = [
  'money',
  'services',
  'distance',
  'information',
  'documents',
  'opportunities',
  'other',
  'none',
] as const;

export const COMMUNITY_PROBLEMS = [
  'food',
  'healthcare',
  'education',
  'livelihood',
  'financial',
  'environmental',
  'other',
] as const;

export const NEED_PRIORITIES = ['critical', 'high', 'moderate', 'low'] as const;

/** Bounds mirror the portal's Groups toggle and the decision-service's clamp. */
export const CLUSTER_K_MIN = 1;
export const CLUSTER_K_MAX = 12;
export const CLUSTER_K_DEFAULT = 3;
/** Rows one request may carry — the survey is small; this is a payload guard. */
export const CLUSTER_MAX_HOUSEHOLDS = 5000;

const OptionalText = z.string().trim().max(2000).nullish();

export const HouseholdSurveySchema = z
  .object({
    needs: z.array(z.enum(NEED_CATEGORIES)).max(NEED_CATEGORIES.length),
    other_need: OptionalText,
    seriousness: z.number().int().min(1).max(5),
    barriers: z.array(z.enum(NEED_BARRIERS)).max(NEED_BARRIERS.length),
    other_barrier: OptionalText,
    community_problem: z.enum(COMMUNITY_PROBLEMS),
    other_community_problem: OptionalText,
    concern: OptionalText,
  })
  .strict();

export const HouseholdSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    family_name: z.string().trim().max(160).default(''),
    barangay: z.string().trim().min(1).max(160),
    members: z.number().int().min(1).max(100),
    survey: HouseholdSurveySchema,
    surveyed_at: z.string().datetime({ offset: true }).nullish(),
  })
  .strict();

export const ClusterNeedsSchema = z
  .object({
    households: z.array(HouseholdSchema).max(CLUSTER_MAX_HOUSEHOLDS),
    k: z.number().int().min(CLUSTER_K_MIN).max(CLUSTER_K_MAX).default(CLUSTER_K_DEFAULT),
    /** Random start for k-means++; the same seed over the same rows is reproducible. */
    seed: z.number().int().min(0).default(0),
  })
  .strict();

export const ClusterBarangaySchema = z.object({
  name: z.string(),
  count: z.number(),
  /** `count` over the cluster's size — how concentrated the group is there. */
  share: z.number(),
});

export const NeedsClusterSchema = z.object({
  /** 0-based, ordered highest need first. */
  index: z.number(),
  household_ids: z.array(z.string()),
  /** Mean of every feature over the members, in original units. */
  centroid: z.record(z.string(), z.number()),
  dominant_need: z.enum(CLUSTER_NEEDS),
  top_barrier: z.enum(NEED_BARRIERS),
  priority: z.enum(NEED_PRIORITIES),
  barangay: ClusterBarangaySchema,
  /** Seriousness (1–5) plus mean named needs ticked (0–5) — what the ranking uses. */
  need_level: z.number(),
});

export const ClusterNeedsResponseSchema = z.object({
  k: z.number(),
  clusters: z.array(NeedsClusterSchema),
  /** Which cluster each household landed in, by household id. */
  assignments: z.record(z.string(), z.number()),
  /** Sum of squared distances to centroids in standardised feature space. */
  inertia: z.number(),
  iterations: z.number(),
  converged: z.boolean(),
  seed: z.number(),
  algorithm: z.string(),
  /** Feature order the model clustered on; centroid keys match. */
  features: z.array(z.string()),
  generated_at: z.string(),
});
