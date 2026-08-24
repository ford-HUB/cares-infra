import { Injectable } from '@nestjs/common';
import type {
  AuditLogChangeDto,
  AuditLogDto,
  AuditLogPageDto,
  AuditLogRangeDto,
  ListAuditLogsQueryDto,
} from '../dto/audit-logs-site-dto';
import {
  AuditLogRepository,
  type AuditLogRow,
} from '../repositories/audit-log-repository';

/** How far back each range reaches, in hours. `all` is unbounded, so it has no entry. */
const RANGE_HOURS: Record<Exclude<AuditLogRangeDto, 'all'>, number> = {
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
};

@Injectable()
export class AuditLogsSiteService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async listLogs(query: ListAuditLogsQueryDto): Promise<AuditLogPageDto> {
    const { rows, total } = await this.auditLogRepository.listLogs({
      search: query.search,
      category: query.category,
      severity: query.severity,
      outcome: query.outcome,
      since: rangeStart(query.range),
      cursor: query.cursor,
      limit: query.limit,
    });

    // A short page means the trail is exhausted; a full one may still have more.
    const exhausted = rows.length < query.limit;

    return {
      items: rows.map(toAuditLog),
      total,
      next_cursor: exhausted
        ? null
        : (rows[rows.length - 1]?.audit_log_id ?? null),
    };
  }
}

function rangeStart(range: AuditLogRangeDto): Date | null {
  if (range === 'all') return null;
  return new Date(Date.now() - RANGE_HOURS[range] * 60 * 60 * 1000);
}

function toAuditLog(row: AuditLogRow): AuditLogDto {
  return {
    audit_log_id: row.audit_log_id,
    action: row.action,
    description: row.description,
    category: row.category,
    severity: row.severity,
    outcome: row.outcome,
    actor_user_id: row.actor_user_id,
    actor_name: row.actor_name,
    actor_email: row.actor_email,
    actor_role: row.actor_role,
    target_type: row.target_type,
    target_label: row.target_label,
    target_id: row.target_id,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    source: row.source,
    request_id: row.request_id,
    reason: row.reason,
    changes: toChanges(row.changes),
    metadata: toMetadata(row.metadata),
    created_at: row.createdAt.toISOString(),
  };
}

/**
 * `changes` and `metadata` are Json columns, so Prisma hands them back as `unknown`
 * shapes. They are normalised here rather than trusted: a malformed row must degrade
 * to an entry with no diff, not fail the whole page.
 */
function toChanges(value: unknown): AuditLogChangeDto[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const { field, before, after } = entry as Record<string, unknown>;
    if (typeof field !== 'string') return [];

    return [
      {
        field,
        before: typeof before === 'string' ? before : null,
        after: typeof after === 'string' ? after : null,
      },
    ];
  });
}

function toMetadata(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
      typeof entry === 'string' ? [[key, entry] as const] : [],
    ),
  );
}
