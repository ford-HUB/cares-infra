import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import {
  GMAIL_STRATEGY_NAME,
  GmailOAuthResult,
} from '../strategies/gmail-strategy';

/** Both Gmail consent legs; `handleRequest` returns null so the controller redirects on failure. */
@Injectable()
export class GmailOAuthGuard extends AuthGuard(GMAIL_STRATEGY_NAME) {
  private readonly logger = new Logger(GmailOAuthGuard.name);

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const state =
      typeof request.query.state === 'string' ? request.query.state : undefined;

    return {
      session: false,
      /** `offline` + forced consent is required for a refresh token. */
      accessType: 'offline',
      prompt: 'consent',
      state,
    };
  }

  handleRequest<TUser = GmailOAuthResult>(
    error: Error | null,
    user: TUser | false,
  ): TUser {
    if (error || !user) {
      this.logger.warn(
        `Gmail consent did not complete: ${error?.message ?? 'no profile returned'}`,
      );
      return null as TUser;
    }

    return user;
  }
}
