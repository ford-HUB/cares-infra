import { RoleType } from "../../../infastructures/prisma/common/client";

export interface LoginDto {
    email: string;
    password: string;
}

export interface LoginResponseDto {
    user_id: string;
    role_type: RoleType;
    email: string;
    firstname: string;
    has_interests: boolean;
    access_token: string;
}

export interface AdminLoginResponseDto extends LoginResponseDto {
    lastname: string;
}

export interface MeResponseDto {
    user_id: string;
    email: string;
    firstname: string;
    lastname: string;
    role_type: RoleType;
}
