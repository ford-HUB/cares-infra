import { EmbeddingType, GenderType, RoleType } from "../../infastructures/prisma/common/client";

export interface CreateUserAccountDto {
    email: string;
    password: string;
}

export interface BiometricDto {
    face_url: string;
    embedding: number[];
    embedding_type: EmbeddingType;
    isActive: boolean;
}

export interface UserSchoolInfoDto {
    id_number: string;
    graduation_year: number;
    graduation_month: number;
    graduation_day: number;
    department: DepartmentDto;
    major: MajorDto;
    year_level: YearLevelDto;
}

export interface CreateUserDto {
    firstname: string;
    lastname: string;
    middle_name: string;
    role_type: RoleType;
    gender: GenderType;
    age: number;
    current_address: string;
    phone_number: string;
    avatar?: string;
    account: CreateUserAccountDto;
    school_info: UserSchoolInfoDto;
    biometric: BiometricDto;
}

export interface DepartmentDto {
    name: string;
}

export interface MajorDto {
    name: string;
}

export interface YearLevelDto {
    name: string;
}
