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
  /** Null for background jobs and deleted actors. */
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
  /** Null = all time. */
  since: Date | null;
  /** Last returned id; the page starts after it. */
  cursor?: string;
  limit: number;
}

/** Append-only: never add update or delete. */
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

  /** Denormalised at write time so renames don't rewrite history. Null if gone. */
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

  /** Keyset paging so new rows can't shift into the next page; id breaks same-ms ties. */
  async listLogs(input: ListAuditLogsInput) {
    const where = buildWhere(input);

    // Concurrent reads; a paged read needs no transaction.
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

  /** Includes entries targeting the account (restrictions, revoked sessions), not just its own actions. */
  async listForAccount(input: ListForAccountInput) {
    return this.prisma.auditLog.findMany({
      where: {
        OR: [
          { actor_user_id: input.userId },
          { target_type: 'user', target_id: input.userId },
          // Entries targeting another record name the owner here.
          { metadata: { path: ['subject_user_id'], equals: input.userId } },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { audit_log_id: 'desc' }],
      take: input.limit,
      ...(input.cursor
        ? { cursor: { audit_log_id: input.cursor }, skip: 1 }
        : {}),
    });
  }
}

export type AuditLogRow = Prisma.AuditLogGetPayload<object>;

export interface ListForAccountInput {
  userId: string;
  /** Last returned id; the page starts after it. */
  cursor?: string;
  limit: number;
}

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
