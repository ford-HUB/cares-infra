import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'src/shared/types/jwt-payload';
import { DurationUtils } from 'src/shared/utils/duration-utils';

@Injectable()
export class JwtService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    if (!this.configService.get<string>('JWT_SECRET')?.trim()) {
      throw new Error('JWT_SECRET is not configured in server/.env');
    }
  }

  private get secret(): string {
    const secret = this.configService.get<string>('JWT_SECRET')?.trim();
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    return secret;
  }

  private get expiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN') ?? '7d';
  }

  /**
   * The same lifetime as `expiresIn`, in seconds, so a session record in Redis can be
   * given a TTL that expires exactly when its token does.
   */
  get expiresInSeconds(): number {
    const value = this.expiresIn.trim();
    const match = /^(\d+)\s*(s|m|h|d)?$/i.exec(value);
    if (!match) {
      throw new Error(`JWT_EXPIRES_IN is not a supported duration: ${value}`);
    }

    const amount = Number(match[1]);
    const unit = (match[2] ?? 's').toLowerCase();
    const seconds: Record<string, number> = {
      s: 1,
      m: DurationUtils.ONE_MINUTE,
      h: DurationUtils.ONE_HOUR,
      d: DurationUtils.ONE_DAY,
    };

    return amount * seconds[unit];
  }

  sign(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  verify(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.secret);
      if (
        typeof decoded === 'string' ||
        !decoded ||
        typeof decoded !== 'object'
      ) {
        throw new UnauthorizedException('Invalid token');
      }

      const payload = decoded as jwt.JwtPayload & Partial<JwtPayload>;
      // Scoped tokens (see `signScoped`) carry an audience; none of them is a
      // session, whatever else they hold.
      if (payload.aud !== undefined) {
        throw new UnauthorizedException('Invalid token');
      }
      if (!payload.sub || !payload.email || !payload.role_type) {
        throw new UnauthorizedException('Invalid token payload');
      }

      return {
        sub: payload.sub,
        email: payload.email,
        role_type: payload.role_type,
        sid: payload.sid,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * A single-purpose token — e.g. the link in a "registration submitted" email —
   * bound to [audience]. `verify` refuses any token with an audience, so one of
   * these can never stand in for a session.
   */
  signScoped(
    subject: string,
    audience: string,
    expiresIn: jwt.SignOptions['expiresIn'],
  ): string {
    return jwt.sign({}, this.secret, { subject, audience, expiresIn });
  }

  /** The subject of a token from `signScoped`, or null when it is not valid for [audience]. */
  verifyScoped(token: string, audience: string): string | null {
    try {
      const decoded = jwt.verify(token, this.secret, { audience });
      if (typeof decoded === 'string' || !decoded?.sub) return null;
      return decoded.sub;
    } catch {
      return null;
    }
  }

  extractBearerToken(authorizationHeader?: string): string | null {
    if (!authorizationHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authorizationHeader.slice('Bearer '.length).trim();
    return token || null;
  }
}
