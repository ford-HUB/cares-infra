import { InterestCode } from "../../infastructures/prisma/common/client";
import { VolunteerProfilePayloadDto, VolunteerProfileResponseDto } from "./onboarding-dto";

export function isInterestCode(value: unknown): value is InterestCode {
    return typeof value === "string" && Object.values(InterestCode).includes(value as InterestCode);
}

export function parseVolunteerProfilePayload(raw: unknown): VolunteerProfilePayloadDto | null {
    if (Array.isArray(raw)) {
        const interests = raw.filter(isInterestCode);
        if (interests.length === 0) {
            return null;
        }

        return {
            interests,
            skills: [],
            availability: [],
        };
    }

    if (!raw || typeof raw !== "object") {
        return null;
    }

    const record = raw as Record<string, unknown>;
    const interests = Array.isArray(record.interests)
        ? record.interests.filter(isInterestCode)
        : [];
    const skills = Array.isArray(record.skills)
        ? record.skills.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];
    const availability = Array.isArray(record.availability)
        ? record.availability.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];
    const hoursPerWeek = typeof record.hours_per_week === "number"
        ? record.hours_per_week
        : undefined;

    if (interests.length === 0) {
        return null;
    }

    return {
        interests,
        skills,
        availability,
        hours_per_week: hoursPerWeek,
    };
}

export function isVolunteerProfileComplete(payload: VolunteerProfilePayloadDto | null): boolean {
    if (!payload) {
        return false;
    }

    return payload.interests.length > 0
        && payload.skills.length > 0
        && payload.availability.length > 0;
}

export function toVolunteerProfileResponse(raw: unknown): VolunteerProfileResponseDto {
    const payload = parseVolunteerProfilePayload(raw);

    return {
        interests: payload?.interests ?? null,
        skills: payload?.skills.length ? payload.skills : null,
        availability: payload?.availability.length ? payload.availability : null,
        hours_per_week: payload?.hours_per_week ?? null,
        profile_complete: isVolunteerProfileComplete(payload),
    };
}

export function serializeVolunteerProfile(payload: VolunteerProfilePayloadDto) {
    return {
        interests: payload.interests,
        skills: payload.skills,
        availability: payload.availability,
        ...(payload.hours_per_week !== undefined ? { hours_per_week: payload.hours_per_week } : {}),
    };
}
