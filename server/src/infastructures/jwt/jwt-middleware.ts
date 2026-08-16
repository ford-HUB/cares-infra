import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from 'src/shared/types/authenticated-request';
import { JwtService } from './jwt-service';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const token = this.jwtService.extractBearerToken(req.headers.authorization);
    if (!token) {
      return next();
    }

    try {
      req.user = this.jwtService.verify(token);
      return next();
    } catch (error) {
      const message =
        error instanceof UnauthorizedException
          ? error.message
          : 'Invalid or expired token';

      return res.status(401).json({
        ok: false,
        message,
      });
    }
  }
}
