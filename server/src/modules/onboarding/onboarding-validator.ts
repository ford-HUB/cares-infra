import { z } from "zod";
import { InterestCode } from "../../infastructures/prisma/common/client";

const enumFromConst = <T extends Record<string, string>>(e: T) => {
    const values = Object.values(e);
    return z.enum(values as [string, ...string[]]);
};

const InterestCodeSchema = enumFromConst(InterestCode);

export const SaveUserInterestsSchema = z
    .object({
        selected: z.array(InterestCodeSchema).min(1),
    })
    .strict();

export type SaveUserInterestsInput = z.infer<typeof SaveUserInterestsSchema>;

export const SaveVolunteerProfileSchema = z
    .object({
        interests: z.array(InterestCodeSchema).min(1),
        skills: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
        availability: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
        hours_per_week: z.number().int().min(1).max(40).optional(),
    })
    .strict();

export type SaveVolunteerProfileInput = z.infer<typeof SaveVolunteerProfileSchema>;

export const UserIdParamSchema = z
    .object({
        userId: z.uuid(),
    })
    .strict();

export const UpdateVolunteerAccountProfileSchema = z
    .object({
        firstname: z.string().trim().min(1).max(80),
        lastname: z.string().trim().min(1).max(80),
        phone_number: z.string().trim().min(7).max(25),
        department: z.string().trim().min(1).max(120).optional(),
        course: z.string().trim().min(1).max(120).optional(),
    })
    .strict();

export type UpdateVolunteerAccountProfileInput = z.infer<typeof UpdateVolunteerAccountProfileSchema>;
