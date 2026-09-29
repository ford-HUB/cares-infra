import { z } from 'zod';
import {
  ChangeEmailResponseSchema,
  ChangeEmailSchema,
  ChangePasswordResponseSchema,
  ChangePasswordSchema,
  OwnSessionSchema,
  OwnSessionsResponseSchema,
  RevokeOwnSessionsResponseSchema,
  SendEmailChangeOtpResponseSchema,
  VerifyEmailChangeOtpResponseSchema,
  VerifyEmailChangeOtpSchema,
} from '../validators/account-settings-volunteer-validator';

export type VerifyEmailChangeOtpDto = z.infer<
  typeof VerifyEmailChangeOtpSchema
>;
export type ChangeEmailDto = z.infer<typeof ChangeEmailSchema>;
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;

export type SendEmailChangeOtpResponseDto = z.infer<
  typeof SendEmailChangeOtpResponseSchema
>;
export type VerifyEmailChangeOtpResponseDto = z.infer<
  typeof VerifyEmailChangeOtpResponseSchema
>;
export type ChangeEmailResponseDto = z.infer<typeof ChangeEmailResponseSchema>;
export type ChangePasswordResponseDto = z.infer<
  typeof ChangePasswordResponseSchema
>;
export type OwnSessionDto = z.infer<typeof OwnSessionSchema>;
export type OwnSessionsResponseDto = z.infer<typeof OwnSessionsResponseSchema>;
export type RevokeOwnSessionsResponseDto = z.infer<
  typeof RevokeOwnSessionsResponseSchema
>;
