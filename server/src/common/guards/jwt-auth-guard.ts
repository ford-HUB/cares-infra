import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public-decorator";
import { AuthenticatedRequest } from "../types/authenticated-request";
import { JwtService } from "src/infastructures/jwt/jwt-service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly jwtService: JwtService,
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

        if (request.user) {
            return true;
        }

        const token = this.jwtService.extractBearerToken(request.headers.authorization);
        if (!token) {
            throw new UnauthorizedException("Authentication required");
        }

        request.user = this.jwtService.verify(token);
        return true;
    }
}
