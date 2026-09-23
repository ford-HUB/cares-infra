import { z } from 'zod';
import {
  ClusterNeedsResponseSchema,
  ClusterNeedsSchema,
  HouseholdSchema,
  NeedsClusterSchema,
} from '../validators/residential-needs-site-validator';

export type HouseholdDto = z.infer<typeof HouseholdSchema>;
export type ClusterNeedsDto = z.infer<typeof ClusterNeedsSchema>;
export type NeedsClusterDto = z.infer<typeof NeedsClusterSchema>;
export type ClusterNeedsResponseDto = z.infer<typeof ClusterNeedsResponseSchema>;
