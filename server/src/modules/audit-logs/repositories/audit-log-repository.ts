import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type AuditCategory,
  type AuditOutcome,
  type AuditSeverity,
  type AuditSource,
  type RoleType,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';
import type { AuditLogChangeDto } from '../dto/audit-logs-site-dto';

export interface RecordAuditEntryInput {
  action: string;
  description: string;
  category: AuditCategory;
  severity: AuditSeverity;
  outcome: AuditOutcome;
  /** Null for background jobs, and for actors whose account was later deleted. */
  actorUserId: string | null;
  actorName: string;
  actorEmail: string;
  actorRole: RoleType | null;
  targetType: string;
  targetLabel: string;
  targetId: string | null;
  ipAddress: string;
  userAgent?: string | null;
  source: AuditSource;
  requestId?: string | null;
  reason?: string | null;
  changes: AuditLogChangeDto[];
  metadata: Record<string, string>;
}

export interface ListAuditLogsInput {
  search?: string;
  category: AuditCategory | 'all';
  severity: AuditSeverity | 'all';
  outcome: AuditOutcome | 'all';
  /** Null means "all time" — the range filter is left off entirely. */
  since: Date | null;
  /** Id of the last row already returned; the page starts after it. */
  cursor?: string;
  limit: number;
}

/**
 * Append-only: there is no update or delete here, and there should never be one. A
 * trail that can be edited answers no question it was written to answer.
 */
@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async recordEntry(data: RecordAuditEntryInput) {
    return this.prisma.auditLog.create({
      data: {
        action: data.action,
        description: data.description,
        category: data.category,
        severity: data.severity,
        outcome: data.outcome,
        actor_user_id: data.actorUserId,
        actor_name: data.actorName,
        actor_email: data.actorEmail,
        actor_role: data.actorRole,
        target_type: data.targetType,
        target_label: data.targetLabel,
        target_id: data.targetId,
        ip_address: data.ipAddress,
        user_agent: data.userAgent ?? null,
        source: data.source,
        request_id: data.requestId ?? null,
        reason: data.reason ?? null,
        changes: data.changes,
        metadata: data.metadata,
      },
      select: { audit_log_id: true },
    });
  }

  /**
   * The actor's display name, denormalised into every entry at write time so a later
   * rename cannot rewrite history. Null when the account is already gone.
   */
  async findActor(userId: string) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        firstname: true,
        lastname: true,
        role: { select: { type: true } },
      },
    });
  }

  /**
   * Keyset paging, matching the sign-in trail: the cursor is the last row already
   * shown, so an entry written while the operator scrolls cannot shift a row into the
   * next page and hide it. The id tiebreaker orders rows written in the same
   * millisecond.
   */
  async listLogs(input: ListAuditLogsInput) {
    const where = buildWhere(input);

    // Two independent reads — a paged read needs no atomicity, so they run
    // concurrently rather than holding a transaction slot open.
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { audit_log_id: 'desc' }],
        take: input.limit,
        ...(input.cursor
          ? { cursor: { audit_log_id: input.cursor }, skip: 1 }
          : {}),
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { rows, total };
  }
}

export type AuditLogRow = Prisma.AuditLogGetPayload<object>;

function buildWhere(
  input: Omit<ListAuditLogsInput, 'cursor' | 'limit'>,
): Prisma.AuditLogWhereInput {
  const search = input.search?.trim();
  const insensitive = { mode: 'insensitive' as const };

  return {
    ...(input.category === 'all' ? {} : { category: input.category }),
    ...(input.severity === 'all' ? {} : { severity: input.severity }),
    ...(input.outcome === 'all' ? {} : { outcome: input.outcome }),
    ...(input.since ? { createdAt: { gte: input.since } } : {}),
    ...(search
      ? {
          OR: [
            { description: { contains: search, ...insensitive } },
            { action: { contains: search, ...insensitive } },
            { actor_name: { contains: search, ...insensitive } },
            { actor_email: { contains: search, ...insensitive } },
            { target_label: { contains: search, ...insensitive } },
            { ip_address: { contains: search, ...insensitive } },
          ],
        }
      : {}),
  };
}
