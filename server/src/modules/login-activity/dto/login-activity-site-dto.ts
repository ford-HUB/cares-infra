import { z } from 'zod';
import {
  ListLoginActivityQuerySchema,
  LoginActivityPageResponseSchema,
  LoginActivityRangeSchema,
  LoginActivitySchema,
} from '../validators/login-activity-site-validator';

export type ListLoginActivityQueryDto = z.infer<
  typeof ListLoginActivityQuerySchema
>;
export type LoginActivityRangeDto = z.infer<typeof LoginActivityRangeSchema>;
export type LoginActivityDto = z.infer<typeof LoginActivitySchema>;
export type LoginActivityPageDto = z.infer<
  typeof LoginActivityPageResponseSchema
>;
