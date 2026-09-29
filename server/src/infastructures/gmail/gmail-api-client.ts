import { Injectable, Logger } from '@nestjs/common';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

/**
 * Gmail answers 429 for a burst of concurrent calls even when the daily quota is
 * nowhere near spent, so a rejected call is worth retrying after a short pause.
 */
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 300;

/** Scopes the portal asks for: read + label changes, send, and the account identity. */
export const GMAIL_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export interface GoogleRefreshedToken {
  access_token: string;
  expires_in: number;
  scope?: string;
}

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailMessageHeader[];
  body?: { attachmentId?: string; size?: number; data?: string };
  parts?: GmailMessagePart[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
}

export interface GmailMessageListPage {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal?: number;
  threadsTotal?: number;
}

interface GoogleErrorPayload {
  error?: { message?: string; status?: string } | string;
  error_description?: string;
}

/**
 * Thin fetch wrapper over the Gmail REST API. It is deliberately stateless — callers
 * pass an access token they already refreshed, mirroring the microservice clients.
 */
@Injectable()
export class GmailApiClient {
  private readonly logger = new Logger(GmailApiClient.name);

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<GoogleRefreshedToken> {
    const body = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_SECRET ?? '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const payload: unknown = await response.json();
    if (!response.ok) {
      throw new Error(
        this.describeError(payload, 'Failed to refresh Google access token'),
      );
    }

    return payload as GoogleRefreshedToken;
  }

  /**
   * Best-effort — a revoked or already-expired token answers 400, which still means the
   * portal side of the connection can be torn down.
   */
  async revokeToken(token: string): Promise<void> {
    try {
      await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch (error) {
      this.logger.warn(
        `Revoking the Google token failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getProfile(accessToken: string): Promise<GmailProfile> {
    return this.request<GmailProfile>(accessToken, '/profile');
  }

  async listMessages(
    accessToken: string,
    options: {
      labelIds?: string[];
      query?: string;
      maxResults: number;
      pageToken?: string;
    },
  ): Promise<GmailMessageListPage> {
    const params = new URLSearchParams({
      maxResults: String(options.maxResults),
    });
    options.labelIds?.forEach((labelId) => params.append('labelIds', labelId));
    if (options.query) params.set('q', options.query);
    if (options.pageToken) params.set('pageToken', options.pageToken);

    return this.request<GmailMessageListPage>(
      accessToken,
      `/messages?${params.toString()}`,
    );
  }

  /** `metadata` is enough for list rows; `full` carries the body for the reading pane. */
  async getMessage(
    accessToken: string,
    messageId: string,
    format: 'metadata' | 'full',
  ): Promise<GmailMessage> {
    const params = new URLSearchParams({ format });
    if (format === 'metadata') {
      [
        'From',
        'To',
        'Cc',
        'Subject',
        'Date',
        'Message-ID',
        'References',
      ].forEach((header) => params.append('metadataHeaders', header));
    }

    return this.request<GmailMessage>(
      accessToken,
      `/messages/${encodeURIComponent(messageId)}?${params.toString()}`,
    );
  }

  async modifyMessageLabels(
    accessToken: string,
    messageId: string,
    labels: { addLabelIds?: string[]; removeLabelIds?: string[] },
  ): Promise<GmailMessage> {
    return this.request<GmailMessage>(
      accessToken,
      `/messages/${encodeURIComponent(messageId)}/modify`,
      { method: 'POST', body: labels },
    );
  }

  /** `raw` is the base64url-encoded RFC 2822 message. */
  async sendMessage(
    accessToken: string,
    raw: string,
    threadId?: string,
  ): Promise<GmailMessage> {
    return this.request<GmailMessage>(accessToken, '/messages/send', {
      method: 'POST',
      body: threadId ? { raw, threadId } : { raw },
    });
  }

  /** Retries the transient statuses with a widening pause; anything else throws at once. */
  private async request<T>(
    accessToken: string,
    path: string,
    init?: { method?: string; body?: unknown },
  ): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.send<T>(accessToken, path, init);
      } catch (error) {
        const retryable =
          error instanceof GmailApiError && RETRY_STATUSES.has(error.status);
        if (!retryable || attempt >= RETRY_ATTEMPTS - 1) throw error;

        await delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }
  }

  private async send<T>(
    accessToken: string,
    path: string,
    init?: { method?: string; body?: unknown },
  ): Promise<T> {
    const response = await fetch(`${GMAIL_API_BASE}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });

    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const message = this.describeError(
        payload,
        `Gmail request failed (${response.status})`,
      );
      throw new GmailApiError(message, response.status);
    }

    return payload as T;
  }

  private describeError(payload: unknown, fallback: string): string {
    const body = payload as GoogleErrorPayload | undefined;
    if (typeof body?.error === 'string') {
      return body.error_description ?? body.error;
    }
    return body?.error?.message ?? fallback;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Carries Google's HTTP status so the service can tell "token dead" from "Gmail is down". */
export class GmailApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'GmailApiError';
  }
}
