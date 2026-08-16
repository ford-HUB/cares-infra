import { z } from 'zod';
import {
  InterestCatalogItemSchema,
  SaveUserInterestsResponseSchema,
  SaveUserInterestsSchema,
  UserInterestsResponseSchema,
} from '../validators/interests-mobile-validator';

export type InterestCatalogItemDto = z.infer<typeof InterestCatalogItemSchema>;
export type SaveUserInterestsDto = z.infer<typeof SaveUserInterestsSchema>;
export type SaveUserInterestsResponseDto = z.infer<
  typeof SaveUserInterestsResponseSchema
>;
export type UserInterestsResponseDto = z.infer<
  typeof UserInterestsResponseSchema
>;
