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

/** Redis, keyed by `session_id`, with the token's TTL. */
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

const UNKNOWN_IP = 'unknown';

/** Throttles `last_seen_at` writes. */
const TOUCH_INTERVAL_SECONDS = DurationUtils.ONE_MINUTE;

/** Source of truth for live tokens (`sid`); `SessionGuard` rejects missing records, so revocation is immediate. */
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

  /** Ends the oldest devices (the new sign-in wins). Best-effort. */
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

      // Newest-first, so the tail is the overflow.
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

  /** Best-effort and throttled. */
  async touch(session: SessionRecord): Promise<void> {
    const sinceLastSeen = Date.now() - new Date(session.last_seen_at).getTime();
    if (sinceLastSeen < TOUCH_INTERVAL_SECONDS * 1000) {
      return;
    }

    try {
      // Keep the remaining TTL so the session expires with its token.
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

  /** Newest first, ties by id: the keyset cursor in `sessions-site-service` needs a stable order. */
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

  /** Keeps the remaining TTLs. */
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

  /** `exceptSessionId` keeps the caller signed in. */
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
