import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  LoginSource,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import { JwtService } from '../../../infastructures/jwt/jwt-service';
import { RedisService } from '../../../infastructures/redis/redis-service';
import { DurationUtils } from '../../../shared/utils/duration-utils';
import { SecurityPolicyService } from '../../security-policy/services/security-policy-service';

/** One signed-in device. Held in Redis, keyed by `session_id`, with the token's TTL. */
export interface SessionRecord {
  session_id: string;
  user_id: string;
  email: string;
  role_type: RoleType;
  source: LoginSource;
  ip_address: string;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
}

export interface CreateSessionInput {
  userId: string;
  email: string;
  roleType: RoleType;
  source: LoginSource;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const SESSION_KEY_PREFIX = 'session:';

/** Stored when Express could not resolve a client address. */
const UNKNOWN_IP = 'unknown';

/**
 * How stale `last_seen_at` may get before a request rewrites it. Without the floor,
 * every authenticated request would issue a Redis write just to move the clock a few
 * milliseconds.
 */
const TOUCH_INTERVAL_SECONDS = DurationUtils.ONE_MINUTE;

/**
 * The source of truth for which tokens are still live. Sign-in writes a record here
 * and puts its id in the JWT's `sid`; `SessionGuard` rejects any token whose record
 * is gone, which is what makes revoking a session take effect immediately.
 */
@Injectable()
export class SessionRegistry {
  private readonly logger = new Logger(SessionRegistry.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly securityPolicyService: SecurityPolicyService,
  ) {}

  async create(input: CreateSessionInput): Promise<SessionRecord> {
    const ttl = this.jwtService.expiresInSeconds;
    const now = new Date();

    const session: SessionRecord = {
      session_id: randomUUID(),
      user_id: input.userId,
      email: input.email,
      role_type: input.roleType,
      source: input.source,
      ip_address: input.ipAddress?.trim() || UNKNOWN_IP,
      user_agent: input.userAgent?.slice(0, 500) ?? null,
      created_at: now.toISOString(),
      last_seen_at: now.toISOString(),
      expires_at: new Date(now.getTime() + ttl * 1000).toISOString(),
    };

    await this.redisService.set(keyOf(session.session_id), session, ttl);
    await this.enforceConcurrencyLimit(input.userId, session.session_id);
    return session;
  }

  /**
   * Keeps an account within `max_concurrent_sessions` by ending its oldest devices —
   * the new sign-in wins, so someone who just authenticated is never the one bounced.
   * Best-effort: the session it was called for is already live, and failing to prune
   * an older device must not turn a valid sign-in into an error.
   */
  private async enforceConcurrencyLimit(
    userId: string,
    keepSessionId: string,
  ): Promise<void> {
    try {
      const { max_concurrent_sessions: limit } =
        await this.securityPolicyService.getPolicy();
      if (limit <= 0) {
        return;
      }

      // `listAll` is newest-first, so everything past the limit is the older tail.
      const owned = (await this.listAll()).filter(
        (session) => session.user_id === userId,
      );
      const doomed = owned
        .filter((session) => session.session_id !== keepSessionId)
        .slice(limit - 1);

      if (doomed.length === 0) {
        return;
      }

      await this.redisService.deleteMany(
        doomed.map((session) => keyOf(session.session_id)),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to apply the concurrent-session limit for user ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async find(sessionId: string): Promise<SessionRecord | null> {
    return this.redisService.get<SessionRecord>(keyOf(sessionId));
  }

  /**
   * Records that the session was used. Best-effort and rate-limited: the request that
   * triggered it is already authenticated, so a failed write must not reject it.
   */
  async touch(session: SessionRecord): Promise<void> {
    const sinceLastSeen = Date.now() - new Date(session.last_seen_at).getTime();
    if (sinceLastSeen < TOUCH_INTERVAL_SECONDS * 1000) {
      return;
    }

    try {
      // Reuse the remaining TTL — a session must expire with its token, not slide
      // forward every time the device makes a request.
      const ttl = await this.redisService.ttl(keyOf(session.session_id));
      if (ttl <= 0) {
        return;
      }

      await this.redisService.set(
        keyOf(session.session_id),
        { ...session, last_seen_at: new Date().toISOString() },
        ttl,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to update last-seen for session ${session.session_id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Every live session, newest sign-in first. Ties break on session id so the order is
   * total — the keyset cursor in `sessions-site-service` relies on it being stable
   * across requests, and Redis returns keys in no particular order.
   */
  async listAll(): Promise<SessionRecord[]> {
    const keys = await this.redisService.scanKeys(`${SESSION_KEY_PREFIX}*`);
    const sessions = await this.redisService.getMany<SessionRecord>(keys);

    return sessions.sort((a, b) => {
      const byCreatedAt =
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return byCreatedAt !== 0
        ? byCreatedAt
        : a.session_id.localeCompare(b.session_id);
    });
  }

  /**
   * Rewrites the address on one account's live sessions after an email change, so the
   * portal's session list and the audit trail stop naming an address that no longer
   * signs in. Remaining TTLs are kept — the tokens themselves did not change.
   */
  async updateEmailForUser(userId: string, email: string): Promise<void> {
    const owned = (await this.listAll()).filter(
      (session) => session.user_id === userId,
    );

    for (const session of owned) {
      const ttl = await this.redisService.ttl(keyOf(session.session_id));
      if (ttl <= 0) {
        continue;
      }
      await this.redisService.set(
        keyOf(session.session_id),
        { ...session, email },
        ttl,
      );
    }
  }

  async revoke(sessionId: string): Promise<void> {
    await this.redisService.delete(keyOf(sessionId));
  }

  /**
   * Signs one account out everywhere. `exceptSessionId` keeps the caller's own device
   * signed in, which is what "sign out my other devices" needs.
   */
  async revokeAllForUser(
    userId: string,
    exceptSessionId?: string,
  ): Promise<number> {
    const sessions = await this.listAll();
    const doomed = sessions.filter(
      (session) =>
        session.user_id === userId && session.session_id !== exceptSessionId,
    );

    return this.redisService.deleteMany(
      doomed.map((session) => keyOf(session.session_id)),
    );
  }
}

function keyOf(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}
