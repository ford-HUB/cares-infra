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

export type RegistrationStep = 'id_uploaded' | 'face_verified' | 'ocr_completed';

export interface IdOcrResultDto {
    firstname: string;
    lastname: string;
    middleName: string;
    gender: string;
    age: number;
    currentAddress: string;
    phoneNumber: string;
    idNumber: string;
    departmentName: string;
    majorName: string;
    yearLevelName: string;
    graduationYear: number;
    graduationMonth: number;
    graduationDay: number;
    volunteerType: string;
    rawTextFront?: string;
    rawTextBack?: string;
}

export interface RegistrationSessionDto {
    idFrontImageUrl: string;
    idBackImageUrl: string;
    selfieUrl: string | null;
    faceMatch: boolean | null;
    faceSimilarity: number | null;
    selfieEmbedding: number[] | null;
    ocrData: IdOcrResultDto | null;
    step: RegistrationStep;
    createdAt: number;
}

export interface UploadIdResponseDto {
    registrationId: string;
}

export interface VerifyFaceResponseDto {
    registrationId: string;
    match: boolean;
    similarity: number;
    threshold: number;
    step: RegistrationStep;
    message: string;
}

export interface ExtractIdResponseDto {
    registrationId: string;
    step: RegistrationStep;
    ocrData: IdOcrResultDto;
}

export interface RegistrationIdDto {
    registrationId: string;
}

export interface RegisterFromSessionDto {
    registrationId: string;
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
}

export interface SendVerificationDto {
    email: string;
}

export interface VerifyOtpDto {
    email: string;
    otp: string;
}

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
