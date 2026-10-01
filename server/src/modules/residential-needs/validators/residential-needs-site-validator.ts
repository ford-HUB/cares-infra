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

/** Shown when the respondent has no barangay on their profile yet. */
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

/**
 * The households are read from the submitted surveys, so the portal only picks
 * how many groups to find and which random start to use.
 */
export const ClusterNeedsSchema = z
  .object({
    k: z
      .number()
      .int()
      .min(CLUSTER_K_MIN)
      .max(CLUSTER_K_MAX)
      .default(CLUSTER_K_DEFAULT),
    /** Random start for k-means++; the same seed over the same rows is reproducible. */
    seed: z.number().int().min(0).default(0),
  })
  .strict();

/**
 * One submitted survey as the portal lists it. Codes come back as plain strings
 * so a retired option never fails the read; they were validated on the way in.
 */
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
