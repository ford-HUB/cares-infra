import { Injectable } from '@nestjs/common';
import type { RequestContextDto } from 'src/shared/decorators/request-context-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  ActivityLogEntryDto,
  ActivityLogPageDto,
  ListMyActivityQueryDto,
  RecordClientActivityDto,
} from '../dto/audit-logs-mobile-dto';
import type { ClientActivityAction } from '../validators/audit-logs-mobile-validator';
import { AuditLogRecorder } from './audit-log-recorder';
import {
  AuditLogRepository,
  type AuditLogRow,
} from '../repositories/audit-log-repository';

/**
 * The Activity Logs screen: everything that happened to this account, newest
 * first — its own actions plus what staff did to it.
 */
@Injectable()
export class AuditLogsMobileService {
  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly auditLogRecorder: AuditLogRecorder,
  ) {}

  async listMyActivity(
    userId: string,
    query: ListMyActivityQueryDto,
  ): Promise<ActivityLogPageDto> {
    // One extra row tells us whether a next page exists without a count query.
    const rows = await this.auditLogRepository.listForAccount({
      userId,
      cursor: query.cursor,
      limit: query.limit + 1,
    });

    const page = rows.slice(0, query.limit);
    const hasMore = rows.length > query.limit;

    return {
      items: page.map((row) => toEntry(row, userId)),
      next_cursor: hasMore ? page[page.length - 1].audit_log_id : null,
    };
  }

  /**
   * Actions that happen entirely on the device — switching the dashboard to
   * another role, unlocking one — never hit a feature endpoint, so the app
   * reports them here to keep the trail complete. Only the allow-listed keys
   * are accepted; the app cannot write arbitrary actions into the audit table.
   */
  async recordClientActivity(
    user: JwtPayload,
    body: RecordClientActivityDto,
    context: RequestContextDto,
  ): Promise<void> {
    await this.auditLogRecorder.record({
      action: body.action,
      description: CLIENT_ACTIVITY_DESCRIPTIONS[body.action](body.metadata),
      category: 'ACCESS_CONTROL',
      actor: user,
      targetType: 'user',
      targetLabel: user.email,
      targetId: user.sub,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      source: 'MOBILE',
      metadata: body.metadata,
    });
  }
}

const CLIENT_ACTIVITY_DESCRIPTIONS: Record<
  ClientActivityAction,
  (metadata: Record<string, string>) => string
> = {
  'account.role.switched': (m) =>
    m.from
      ? `Switched dashboard from ${roleLabel(m.from)} to ${roleLabel(m.to)}`
      : `Switched dashboard to ${roleLabel(m.to)}`,
  'account.role.unlocked': (m) =>
    `Unlocked the ${roleLabel(m.role)} role${m.method ? ` (${m.method})` : ''}`,
};

function roleLabel(role: string | undefined): string {
  const value = (role ?? '').trim().toLowerCase();
  return value ? value[0].toUpperCase() + value.slice(1) : 'a role';
}

function toEntry(row: AuditLogRow, viewerId: string): ActivityLogEntryDto {
  return {
    activity_log_id: row.audit_log_id,
    action: row.action,
    description: row.description,
    category: row.category,
    outcome: row.outcome,
    target_label: row.target_label,
    source: row.source,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    by_self: row.actor_user_id === viewerId,
    actor_name: row.actor_name,
    actor_role: row.actor_role,
    metadata: (row.metadata ?? {}) as Record<string, string>,
    created_at: row.createdAt.toISOString(),
  };
}
