import { z } from 'zod';
import {
  SecurityPolicyResponseSchema,
  SecurityPolicySchema,
  UpdateSecurityPolicySchema,
} from '../validators/security-policy-site-validator';

/** The settings themselves, without the audit fields the response carries. */
export type SecurityPolicyValuesDto = z.infer<typeof SecurityPolicySchema>;
export type UpdateSecurityPolicyDto = z.infer<
  typeof UpdateSecurityPolicySchema
>;
export type SecurityPolicyDto = z.infer<typeof SecurityPolicyResponseSchema>;
