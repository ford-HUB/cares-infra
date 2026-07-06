import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { JwtPayload } from "../types/jwt-payload";
import { AuthenticatedRequest } from "../types/authenticated-request";

export const CurrentUser = createParamDecorator(
    (_data: unknown, context: ExecutionContext): JwtPayload => {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        return request.user as JwtPayload;
    },
);
