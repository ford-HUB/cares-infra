import { z } from 'zod';
import { RoleType } from '../../../infastructures/prisma/common/client';
import { HouseholdSurveySchema } from './residential-needs-site-validator';

/** Every mobile side can answer; the app's role switcher is local to the device. */
export const MOBILE_NEEDS_ROLE_TYPES = [
  RoleType.VOLUNTEER,
  RoleType.DONOR,
  RoleType.BENEFICIARY,
] as const;

/**
 * The beneficiary's own answers, in the same codes the Clusters screen feeds
 * the model. Picking `other` needs the matching free text, and `none` on Q3
 * cannot sit beside a real barrier.
 */
export const SubmitNeedsAssessmentSchema = HouseholdSurveySchema.extend({
  needs: HouseholdSurveySchema.shape.needs.min(
    1,
    'Choose at least one household need',
  ),
  barriers: HouseholdSurveySchema.shape.barriers.min(
    1,
    'Choose at least one difficulty, or "No difficulty"',
  ),
})
  .strict()
  .superRefine((survey, ctx) => {
    const missing = (value?: string | null) => !value?.trim();
    if (survey.needs.includes('other') && missing(survey.other_need)) {
      ctx.addIssue({
        code: 'custom',
        path: ['other_need'],
        message: 'Tell us what other need your household has',
      });
    }
    if (survey.barriers.includes('other') && missing(survey.other_barrier)) {
      ctx.addIssue({
        code: 'custom',
        path: ['other_barrier'],
        message: 'Tell us what else makes it difficult',
      });
    }
    if (survey.barriers.includes('none') && survey.barriers.length > 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['barriers'],
        message: '"No difficulty" cannot be combined with other answers',
      });
    }
    if (
      survey.community_problem === 'other' &&
      missing(survey.other_community_problem)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['other_community_problem'],
        message: 'Describe the problem you see in your community',
      });
    }
  });

/** Stored answers come back as plain strings so an old code never fails the read. */
export const MobileNeedsAssessmentSchema = z.object({
  needs: z.array(z.string()),
  other_need: z.string().nullable(),
  seriousness: z.number(),
  barriers: z.array(z.string()),
  other_barrier: z.string().nullable(),
  community_problem: z.string(),
  other_community_problem: z.string().nullable(),
  concern: z.string().nullable(),
  submitted_at: z.iso.datetime(),
});

/** `assessment` is null until the survey has been taken once. */
export const MyNeedsAssessmentResponseSchema = z.object({
  assessment: MobileNeedsAssessmentSchema.nullable(),
});
