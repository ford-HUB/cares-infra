import { InterestCode } from "../../../infastructures/prisma/common/client";

export interface InterestCatalogItemDto {
    code: InterestCode;
    label: string;
    description: string | null;
    sort_order: number;
}

export interface SaveUserInterestsDto {
    selected: InterestCode[];
}

export interface UserInterestsResponseDto {
    selected: InterestCode[] | null;
}
