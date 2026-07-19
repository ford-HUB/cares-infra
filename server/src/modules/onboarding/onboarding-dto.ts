import { InterestCode } from "../../infastructures/prisma/common/client";

export interface InterestCatalogItemDto {
    code: InterestCode;
    label: string;
    description: string | null;
    sort_order: number;
}

export interface VolunteerProfilePayloadDto {
    interests: InterestCode[];
    skills: string[];
    availability: string[];
    hours_per_week?: number;
}

export interface SaveVolunteerProfileDto extends VolunteerProfilePayloadDto {}

export interface VolunteerProfileResponseDto {
    interests: InterestCode[] | null;
    skills: string[] | null;
    availability: string[] | null;
    hours_per_week: number | null;
    profile_complete: boolean;
}

/** @deprecated Use SaveVolunteerProfileDto */
export interface SaveUserInterestsDto {
    selected: InterestCode[];
}

/** @deprecated Use VolunteerProfileResponseDto */
export interface UserInterestsResponseDto {
    selected: InterestCode[] | null;
}
