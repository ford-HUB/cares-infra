import { z } from 'zod';
import {
  DonorOAuthProfileSchema,
  DonorOAuthResponseSchema,
  DonorOAuthSchema,
  RegisterDonorSchema,
} from '../validators/auth-donor-validator';

export type DonorOAuthDto = z.infer<typeof DonorOAuthSchema>;
export type DonorOAuthProfileDto = z.infer<typeof DonorOAuthProfileSchema>;
export type DonorOAuthResponseDto = z.infer<typeof DonorOAuthResponseSchema>;
export type RegisterDonorDto = z.infer<typeof RegisterDonorSchema>;

/**
 * Redis-only record behind an `oauth_ticket` — never serialized to a client, so it has
 * no schema. It exists so the registration call can trust an identity that was verified
 * on an earlier request without re-presenting the provider token.
 */
export interface DonorOAuthTicketDto {
  provider: DonorOAuthProfileDto['provider'];
  providerUserId: string;
  email: string;
  firstname: string;
  middleName: string;
  lastname: string;
  avatar: string | null;
  createdAt: number;
}
