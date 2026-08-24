import { Injectable, Logger } from '@nestjs/common';
import type {
  AuditCategory,
  AuditOutcome,
  AuditSeverity,
  AuditSource,
} from '../../../infastructures/prisma/common/client';
import type { JwtPayload } from '../../../shared/types/jwt-payload';
import type { AuditLogChangeDto } from '../dto/audit-logs-site-dto';
import { AuditLogRepository } from '../repositories/audit-log-repository';

/** Stored when Express could not resolve a client address, so the column stays non-null. */
const UNKNOWN_IP = 'unknown';

export interface AuditEntry {
  /** Machine key, e.g. `security-policy.updated` — stable across wording changes. */
  action: string;
  /** The sentence the portal renders in the grid. */
  description: string;
  category: AuditCategory;
  severity?: AuditSeverity;
  outcome?: AuditOutcome;
  /** Null for background jobs; the caller's token otherwise. */
  actor: JwtPayload | null;
  targetType: string;
  targetLabel: string;
  targetId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: AuditSource;
  requestId?: string | null;
  reason?: string | null;
  changes?: AuditLogChangeDto[];
  metadata?: Record<string, string>;
}

/**
 * Writes the audit trail on behalf of the features that perform privileged actions.
 * Best-effort, like the sign-in trail: losing a row is bad, but failing the action the
 * operator actually asked for — after it already succeeded — is worse and leaves the
 * portal showing an error for work that was done.
 */
@Injectable()
export class AuditLogRecorder {
  private readonly logger = new Logger(AuditLogRecorder.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      const actor = entry.actor
        ? await this.resolveActor(entry.actor)
        : SYSTEM_ACTOR;

      await this.auditLogRepository.recordEntry({
        action: entry.action,
        description: entry.description,
        category: entry.category,
        severity: entry.severity ?? 'INFO',
        outcome: entry.outcome ?? 'SUCCESS',
        actorUserId: actor.userId,
        actorName: actor.name,
        actorEmail: actor.email,
        actorRole: actor.role,
        targetType: entry.targetType,
        targetLabel: entry.targetLabel,
        targetId: entry.targetId ?? null,
        ipAddress: entry.ipAddress?.trim() || UNKNOWN_IP,
        userAgent: entry.userAgent?.slice(0, 500) ?? null,
        source: entry.source ?? 'PORTAL',
        requestId: entry.requestId ?? null,
        reason: entry.reason ?? null,
        changes: entry.changes ?? [],
        metadata: entry.metadata ?? {},
      });
    } catch (error) {
      this.logger.error(
        `Failed to record audit entry ${entry.action}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * The token carries the email and role but not the name, so it is read once here.
   * A missing user is not an error: the token proves who acted, and the email stands
   * in for the name.
   */
  private async resolveActor(actor: JwtPayload) {
    const user = await this.auditLogRepository.findActor(actor.sub);
    const name = user ? `${user.firstname} ${user.lastname}`.trim() : '';

    return {
      userId: actor.sub,
      name: name || actor.email,
      email: actor.email,
      role: user?.role.type ?? actor.role_type,
    };
  }
}

const SYSTEM_ACTOR = {
  userId: null,
  name: 'System',
  email: 'system',
  role: null,
} as const;
