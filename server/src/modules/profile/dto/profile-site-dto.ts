import { z } from 'zod';
import { GenderType } from '../../../infastructures/prisma/common/client';
import {
  PortalProfileResponseSchema,
  UpdatePortalProfileSchema,
} from '../validators/profile-site-validator';

export type ProfileAssetKind = 'avatar' | 'signature';

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
