import { z } from 'zod';
import {
  AccessRequestResponseSchema,
  AccessRequestSchema,
  AdminLoginResponseSchema,
  LoginResponseSchema,
  LoginSchema,
  MeResponseSchema,
} from '../validators/auth-site-validator';

export type LoginDto = z.infer<typeof LoginSchema>;
export type LoginResponseDto = z.infer<typeof LoginResponseSchema>;
export type AdminLoginResponseDto = z.infer<typeof AdminLoginResponseSchema>;
export type MeResponseDto = z.infer<typeof MeResponseSchema>;
export type AccessRequestDto = z.infer<typeof AccessRequestSchema>;
export type AccessRequestResponseDto = z.infer<
  typeof AccessRequestResponseSchema
>;
