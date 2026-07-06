import { RoleType } from "../../infastructures/prisma/common/client";

export interface JwtPayload {
    sub: string;
    email: string;
    role_type: RoleType;
}
