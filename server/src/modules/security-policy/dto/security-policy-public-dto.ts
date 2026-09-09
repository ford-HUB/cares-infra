import { z } from 'zod';
import { PasswordRulesResponseSchema } from '../validators/security-policy-public-validator';

export type PasswordRulesDto = z.infer<typeof PasswordRulesResponseSchema>;
