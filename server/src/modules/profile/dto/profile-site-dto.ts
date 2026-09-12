import { z } from 'zod';
import {
  GenderType,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import {
  PortalProfileResponseSchema,
  UpdatePortalProfileSchema,
} from '../validators/profile-site-validator';

/**
 * `avatar` / `signature` are the portal's assets on the user row;
 * `avatar:<ROLE>` is a mobile role's own photo (see `UserRoleAvatar`).
 */
export type ProfileAssetKind = 'avatar' | 'signature' | `avatar:${RoleType}`;

export type PortalProfileDto = z.infer<typeof PortalProfileResponseSchema>;
export type UpdatePortalProfileDto = z.infer<typeof UpdatePortalProfileSchema>;

/** Repository-facing shape — `department` is resolved to null for directors before persisting. */
export interface PersistPortalProfileDto {
  firstname: string;
  lastname: string;
  phone_number: string;
  gender: GenderType;
  age: number;
  department: string | null;
  address_street: string;
  address_barangay: string;
  address_city: string;
  address_province: string;
}
