import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import {
  GMAIL_STRATEGY_NAME,
  GmailOAuthResult,
} from '../strategies/gmail-strategy';

/**
 * Drives both legs of the Gmail consent flow: on `/google` passport redirects the
 * browser to Google, on `/google/callback` it exchanges the code for tokens.
 *
 * A denied or failed consent must land the admin back in the portal rather than on a
 * JSON error page, so `handleRequest` returns `null` instead of throwing — the
 * controller turns that into a redirect carrying an error flag.
 */
@Injectable()
export class GmailOAuthGuard extends AuthGuard(GMAIL_STRATEGY_NAME) {
  private readonly logger = new Logger(GmailOAuthGuard.name);

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const state =
      typeof request.query.state === 'string' ? request.query.state : undefined;

    return {
      session: false,
      /**
       * `offline` + a forced consent screen is what makes Google return a refresh
       * token; without it a reconnect yields an access token that dies in an hour.
       */
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
