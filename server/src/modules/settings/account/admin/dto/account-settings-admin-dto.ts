import { z } from 'zod';
import {
  ChangeEmailResponseSchema,
  ChangeEmailSchema,
  ChangePasswordResponseSchema,
  ChangePasswordSchema,
} from '../validators/account-settings-admin-validator';

export type ChangeEmailDto = z.infer<typeof ChangeEmailSchema>;
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
export type ChangeEmailResponseDto = z.infer<typeof ChangeEmailResponseSchema>;
export type ChangePasswordResponseDto = z.infer<
  typeof ChangePasswordResponseSchema
>;
