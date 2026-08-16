import { z } from 'zod';
import { InterestCode } from '../../../infastructures/prisma/common/client';

const InterestCodeSchema = z.enum(InterestCode);

export const SaveUserInterestsSchema = z
  .object({
    selected: z.array(InterestCodeSchema).min(1),
  })
  .strict();

export const UserIdParamSchema = z.uuid();

export const InterestCatalogItemSchema = z.object({
  code: InterestCodeSchema,
  label: z.string(),
  description: z.string().nullable(),
  sort_order: z.number(),
});

export const InterestCatalogResponseSchema = z.array(InterestCatalogItemSchema);

export const SaveUserInterestsResponseSchema = z.object({
  user_interest_id: z.string(),
  user_id: z.string(),
  selected: z.array(InterestCodeSchema),
});

export const UserInterestsResponseSchema = z.object({
  selected: z.array(InterestCodeSchema).nullable(),
});
