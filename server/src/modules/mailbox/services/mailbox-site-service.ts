import { randomUUID } from 'node:crypto';
import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { GmailConnection } from '../../../infastructures/prisma/common/client';
import {
  GmailApiClient,
  GmailApiError,
  GmailMessage,
} from '../../../infastructures/gmail/gmail-api-client';
import {
  buildRawMessage,
  extractAttachments,
  extractBodies,
  headerValue,
  parseAddress,
  parseAddressList,
} from '../../../infastructures/gmail/gmail-message-codec';
import { GmailOAuthResult } from '../../../infastructures/passport/strategies/gmail-strategy';
import { RedisService } from '../../../infastructures/redis/redis-service';
import { DurationUtils } from '../../../shared/utils/duration-utils';
import {
  ListMailQueryDto,
  MailDetailDto,
  MailListDto,
  MailSummaryDto,
  MailboxAuthorizeDto,
  MailboxConnectionDto,
  MailboxDisconnectDto,
  MailboxFolder,
  MarkMailReadDto,
  SendMailDto,
  SendMailResponseDto,
} from '../dto/mailbox-site-dto';
import { MailboxRepository } from '../repositories/mailbox-repository';
import {
  apiPublicUrl,
  portalUrl,
} from '../../../shared/utils/environment-utils';

const FOLDER_LABELS: Record<MailboxFolder, string> = {
  inbox: 'INBOX',
  starred: 'STARRED',
  sent: 'SENT',
  drafts: 'DRAFT',
  spam: 'SPAM',
  trash: 'TRASH',
};

const OAUTH_STATE_PREFIX = 'gmail:oauth:state:';
const OAUTH_STATE_TTL = DurationUtils.ONE_MINUTE * 10;
/** Refresh early so a token can't expire mid-call. */
const TOKEN_REFRESH_MARGIN_MS = 60_000;

/** Bounded fan-out: Gmail rejects too many concurrent requests per user. */
const MESSAGE_HYDRATION_CONCURRENCY = 4;

const NOT_CONNECTED_MESSAGE =
  'No Google account is connected. Connect a mailbox to continue.';

interface OAuthStatePayload {
  user_id: string;
}

@Injectable()
export class MailboxSiteService {
  private readonly logger = new Logger(MailboxSiteService.name);

  constructor(
    private readonly mailboxRepository: MailboxRepository,
    private readonly gmailApiClient: GmailApiClient,
    private readonly redisService: RedisService,
  ) {}

  async getConnection(userId: string): Promise<MailboxConnectionDto> {
    const connection =
      await this.mailboxRepository.findConnectionByUserId(userId);
    if (!connection) {
      return { connected: false, email: null, connected_at: null };
    }

    return {
      connected: true,
      email: connection.email,
      connected_at: connection.createdAt.toISOString(),
    };
  }

  /** Identity parked in Redis under a single-use nonce that doubles as the OAuth `state` (CSRF). */
  async createAuthorizeUrl(userId: string): Promise<MailboxAuthorizeDto> {
    const nonce = randomUUID();
    await this.redisService.set(
      `${OAUTH_STATE_PREFIX}${nonce}`,
      { user_id: userId } satisfies OAuthStatePayload,
      OAUTH_STATE_TTL,
    );

    const apiBaseUrl = apiPublicUrl();

    return {
      authorize_url: `${apiBaseUrl}/api/v1/mailbox/google?state=${encodeURIComponent(nonce)}`,
    };
  }

  /** Never throws: every outcome must redirect with a status flag. */
  async completeConnection(
    state: string | undefined,
    result: GmailOAuthResult | null,
  ): Promise<string> {
    if (!state) {
      return this.portalRedirect('error');
    }

    const stateKey = `${OAUTH_STATE_PREFIX}${state}`;
    const payload = await this.redisService.get<OAuthStatePayload>(stateKey);
    // Single use, so a replayed callback can't relink.
    await this.redisService.delete(stateKey);

    if (!payload) {
      this.logger.warn(
        'Gmail callback arrived with an unknown or expired state',
      );
      return this.portalRedirect('expired');
    }

    if (!result?.access_token || !result.email) {
      return this.portalRedirect('denied');
    }

    /** Google may omit the refresh token on repeat consent; keep the previous one. */
    const existing = await this.mailboxRepository.findConnectionByUserId(
      payload.user_id,
    );
    const refreshToken = result.refresh_token ?? existing?.refresh_token;
    if (!refreshToken) {
      this.logger.warn('Google returned no refresh token and none was stored');
      return this.portalRedirect('error');
    }

    await this.mailboxRepository.upsertConnection(payload.user_id, {
      google_sub: result.google_sub,
      email: result.email,
      scope: result.scope,
      access_token: result.access_token,
      refresh_token: refreshToken,
      access_expires_at: new Date(Date.now() + result.expires_in * 1000),
    });

    return this.portalRedirect('connected');
  }

  async disconnect(userId: string): Promise<MailboxDisconnectDto> {
    const connection =
      await this.mailboxRepository.findConnectionByUserId(userId);
    if (!connection) {
      return { disconnected: true };
    }

    // Revoke first so a failed delete leaves no stale grant.
    await this.gmailApiClient.revokeToken(connection.refresh_token);
    await this.mailboxRepository.deleteConnection(userId);

    return { disconnected: true };
  }

  async listMail(
    userId: string,
    query: ListMailQueryDto,
  ): Promise<MailListDto> {
    return this.withAccessToken(userId, async (accessToken) => {
      const page = await this.gmailApiClient.listMessages(accessToken, {
        labelIds: [FOLDER_LABELS[query.folder]],
        query: query.search,
        maxResults: query.page_size,
        pageToken: query.page_token,
      });

      const messages = await this.mapWithLimit(
        page.messages ?? [],
        MESSAGE_HYDRATION_CONCURRENCY,
        (entry) =>
          this.gmailApiClient.getMessage(accessToken, entry.id, 'metadata'),
      );

      return {
        messages: messages.map((message) => this.toSummary(message)),
        next_page_token: page.nextPageToken ?? null,
        estimated_total: page.resultSizeEstimate ?? messages.length,
      };
    });
  }

  async getMail(userId: string, messageId: string): Promise<MailDetailDto> {
    return this.withAccessToken(userId, async (accessToken) => {
      const message = await this.gmailApiClient
        .getMessage(accessToken, messageId, 'full')
        .catch((error: unknown) => {
          if (error instanceof GmailApiError && error.status === 404) {
            throw new NotFoundException(
              'That message no longer exists in Gmail',
            );
          }
          throw error;
        });

      const bodies = extractBodies(message);

      return {
        ...this.toSummary(message),
        cc: parseAddressList(headerValue(message, 'Cc')),
        body_html: bodies.html,
        body_text: bodies.text,
        message_id_header: headerValue(message, 'Message-ID') || null,
        attachments: extractAttachments(message),
      };
    });
  }

  async markRead(
    userId: string,
    messageId: string,
    data: MarkMailReadDto,
  ): Promise<MailSummaryDto> {
    return this.withAccessToken(userId, async (accessToken) => {
      const message = await this.gmailApiClient.modifyMessageLabels(
        accessToken,
        messageId,
        data.unread
          ? { addLabelIds: ['UNREAD'] }
          : { removeLabelIds: ['UNREAD'] },
      );

      // `modify` returns labels only.
      const refreshed = await this.gmailApiClient.getMessage(
        accessToken,
        message.id,
        'metadata',
      );
      return this.toSummary(refreshed);
    });
  }

  async sendMail(
    userId: string,
    data: SendMailDto,
  ): Promise<SendMailResponseDto> {
    const connection = await this.requireConnection(userId);

    return this.withAccessToken(userId, async (accessToken) => {
      const raw = buildRawMessage({
        from: connection.email,
        to: data.to,
        cc: data.cc,
        bcc: data.bcc,
        subject: data.subject,
        body: data.body,
        inReplyTo: data.in_reply_to,
      });

      const sent = await this.gmailApiClient.sendMessage(
        accessToken,
        raw,
        data.thread_id,
      );
      return { id: sent.id, thread_id: sent.threadId };
    });
  }

  /** Preserves input order. */
  private async mapWithLimit<TItem, TResult>(
    items: TItem[],
    limit: number,
    run: (item: TItem) => Promise<TResult>,
  ): Promise<TResult[]> {
    const results = new Array<TResult>(items.length);
    let cursor = 0;

    const worker = async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await run(items[index]);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(limit, items.length) }, worker),
    );
    return results;
  }

  private toSummary(message: GmailMessage): MailSummaryDto {
    const from = parseAddress(headerValue(message, 'From'));
    const labels = message.labelIds ?? [];

    return {
      id: message.id,
      thread_id: message.threadId,
      from_name: from.name,
      from_email: from.email,
      to: parseAddressList(headerValue(message, 'To')),
      subject: headerValue(message, 'Subject') || '(no subject)',
      snippet: message.snippet ?? '',
      received_at: this.receivedAt(message),
      unread: labels.includes('UNREAD'),
      starred: labels.includes('STARRED'),
      /** Best effort: `metadata` omits body parts; the detail view is authoritative. */
      has_attachments: extractAttachments(message).length > 0,
    };
  }

  private receivedAt(message: GmailMessage): string {
    if (message.internalDate) {
      return new Date(Number(message.internalDate)).toISOString();
    }

    const header = headerValue(message, 'Date');
    const parsed = header ? new Date(header) : null;
    return parsed && !Number.isNaN(parsed.getTime())
      ? parsed.toISOString()
      : new Date(0).toISOString();
  }

  private async requireConnection(userId: string): Promise<GmailConnection> {
    const connection =
      await this.mailboxRepository.findConnectionByUserId(userId);
    if (!connection) {
      throw new PreconditionFailedException(NOT_CONNECTED_MESSAGE);
    }
    return connection;
  }

  /** Refreshes near expiry and retries once on rejection. */
  private async withAccessToken<T>(
    userId: string,
    operation: (accessToken: string) => Promise<T>,
  ): Promise<T> {
    const connection = await this.requireConnection(userId);
    let accessToken = connection.access_token;

    if (
      connection.access_expires_at.getTime() - TOKEN_REFRESH_MARGIN_MS <=
      Date.now()
    ) {
      accessToken = await this.refreshAccessToken(connection);
    }

    try {
      return await operation(accessToken);
    } catch (error) {
      if (!(error instanceof GmailApiError) || error.status !== 401) {
        throw this.asClientError(error);
      }

      const refreshed = await this.refreshAccessToken(connection);
      try {
        return await operation(refreshed);
      } catch (retryError) {
        throw this.asClientError(retryError);
      }
    }
  }

  private async refreshAccessToken(
    connection: GmailConnection,
  ): Promise<string> {
    try {
      const refreshed = await this.gmailApiClient.refreshAccessToken(
        connection.refresh_token,
      );

      await this.mailboxRepository.updateAccessToken(
        connection.user_id,
        refreshed.access_token,
        new Date(Date.now() + refreshed.expires_in * 1000),
      );

      return refreshed.access_token;
    } catch (error) {
      /** A failed refresh is permanent; dropping the row returns the page to the connect screen. */
      this.logger.warn(
        `Dropping the Gmail connection for ${connection.user_id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      await this.mailboxRepository.deleteConnection(connection.user_id);
      throw new PreconditionFailedException(
        'Google ended the connection to this mailbox. Connect it again to continue.',
      );
    }
  }

  /** Unreachable Gmail is a gateway error, not a bad request. */
  private asClientError(error: unknown): unknown {
    if (error instanceof GmailApiError) {
      this.logger.error(
        `Gmail API responded ${error.status}: ${error.message}`,
      );
      return new BadGatewayException(`Gmail request failed: ${error.message}`);
    }
    return error;
  }

  private portalRedirect(status: string): string {
    const target =
      process.env.MAILBOX_REDIRECT_URL ?? `${portalUrl()}/admin/mail-inbox`;
    return `${target}?gmail=${status}`;
  }
}
