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

export const UserIdParamSchema = z
    .object({
        userId: z.uuid(),
    })
    .strict();
