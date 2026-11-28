import { z } from 'zod';

/** Survey Q1 choices. */
export const NEED_CATEGORIES = [
  'food',
  'healthcare',
  'education',
  'livelihood',
  'financial',
  'other',
] as const;

/** Clustered needs; excludes free-text `other`. */
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

/** Keep in sync with portal toggle and decision-service clamp. */
export const CLUSTER_K_MIN = 1;
export const CLUSTER_K_MAX = 12;
export const CLUSTER_K_DEFAULT = 3;

export const UNSPECIFIED_BARANGAY = 'Unspecified';

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

export const ClusterNeedsSchema = z
  .object({
    k: z
      .number()
      .int()
      .min(CLUSTER_K_MIN)
      .max(CLUSTER_K_MAX)
      .default(CLUSTER_K_DEFAULT),
    /** k-means++ seed; deterministic per row set. */
    seed: z.number().int().min(0).default(0),
  })
  .strict();

/** Plain strings so retired codes still parse. */
export const HouseholdRowSchema = z.object({
  id: z.string(),
  family_name: z.string(),
  barangay: z.string(),
  members: z.number(),
  survey: z.object({
    needs: z.array(z.string()),
    other_need: z.string().nullable(),
    seriousness: z.number(),
    barriers: z.array(z.string()),
    other_barrier: z.string().nullable(),
    community_problem: z.string(),
    other_community_problem: z.string().nullable(),
    concern: z.string().nullable(),
  }),
  surveyed_at: z.iso.datetime(),
});

export const HouseholdListResponseSchema = z.object({
  items: z.array(HouseholdRowSchema),
});

export const ClusterBarangaySchema = z.object({
  name: z.string(),
  count: z.number(),
  /** count / cluster size. */
  share: z.number(),
});

export const NeedsClusterSchema = z.object({
  /** 0-based, highest need first. */
  index: z.number(),
  household_ids: z.array(z.string()),
  /** Per-feature mean, original units. */
  centroid: z.record(z.string(), z.number()),
  dominant_need: z.enum(CLUSTER_NEEDS),
  top_barrier: z.enum(NEED_BARRIERS),
  priority: z.enum(NEED_PRIORITIES),
  barangay: ClusterBarangaySchema,
  /** Seriousness (1–5) + mean needs ticked (0–5); ranking key. */
  need_level: z.number(),
});

export const ClusterNeedsResponseSchema = z.object({
  k: z.number(),
  clusters: z.array(NeedsClusterSchema),
  /** household_id -> cluster index. */
  assignments: z.record(z.string(), z.number()),
  /** SSE in standardised feature space. */
  inertia: z.number(),
  iterations: z.number(),
  converged: z.boolean(),
  seed: z.number(),
  algorithm: z.string(),
  /** Feature order; matches centroid keys. */
  features: z.array(z.string()),
  generated_at: z.string(),
});
