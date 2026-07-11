import { GenderType, RoleType } from '../../../infastructures/prisma/common/client';

export type ProfileAssetKind = 'avatar' | 'signature';

export interface PortalProfileDto {
    firstname: string;
    lastname: string;
    email: string;
    has_profile_image: boolean;
    has_signature: boolean;
    department: string | null;
    phone_number: string;
    gender: GenderType;
    address: {
        street: string | null;
        barangay: string | null;
        city: string | null;
        province: string | null;
    };
    role_type: RoleType;
    profile_complete: boolean;
}

export interface UpdatePortalProfileDto {
    firstname: string;
    lastname: string;
    phone_number: string;
    gender: GenderType;
    department: string | null;
    address_street: string;
    address_barangay: string;
    address_city: string;
    address_province: string;
}
