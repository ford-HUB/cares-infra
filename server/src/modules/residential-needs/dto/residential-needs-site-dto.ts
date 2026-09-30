import { z } from 'zod';
import {
  ClusterNeedsResponseSchema,
  ClusterNeedsSchema,
  HouseholdListResponseSchema,
  HouseholdRowSchema,
  NeedsClusterSchema,
} from '../validators/residential-needs-site-validator';

export type HouseholdRowDto = z.infer<typeof HouseholdRowSchema>;
export type HouseholdListResponseDto = z.infer<
  typeof HouseholdListResponseSchema
>;
export type ClusterNeedsDto = z.infer<typeof ClusterNeedsSchema>;
export type NeedsClusterDto = z.infer<typeof NeedsClusterSchema>;
export type ClusterNeedsResponseDto = z.infer<
  typeof ClusterNeedsResponseSchema
>;
