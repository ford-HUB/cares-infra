import { Injectable } from '@nestjs/common';
import type {
  ListLoginActivityQueryDto,
  LoginActivityDto,
  LoginActivityPageDto,
  LoginActivityRangeDto,
} from '../dto/login-activity-site-dto';
import {
  LoginActivityRepository,
  type LoginActivityRow,
} from '../repositories/login-activity-repository';

/** How far back each range reaches, in hours. `all` is unbounded, so it has no entry. */
const RANGE_HOURS: Record<Exclude<LoginActivityRangeDto, 'all'>, number> = {
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
};

@Injectable()
export class LoginActivitySiteService {
  constructor(
    private readonly loginActivityRepository: LoginActivityRepository,
  ) {}

  async listActivity(
    query: ListLoginActivityQueryDto,
  ): Promise<LoginActivityPageDto> {
    const { rows, total } = await this.loginActivityRepository.listActivity({
      search: query.search,
      outcome: query.outcome,
      source: query.source,
      since: rangeStart(query.range),
      cursor: query.cursor,
      limit: query.limit,
    });

    // A short page means the trail is exhausted; a full one may still have more.
    const exhausted = rows.length < query.limit;

    return {
      items: rows.map(toLoginActivity),
      total,
      next_cursor: exhausted
        ? null
        : (rows[rows.length - 1]?.login_activity_id ?? null),
    };
  }
}

function rangeStart(range: LoginActivityRangeDto): Date | null {
  if (range === 'all') return null;
  return new Date(Date.now() - RANGE_HOURS[range] * 60 * 60 * 1000);
}

function toLoginActivity(row: LoginActivityRow): LoginActivityDto {
  return {
    login_activity_id: row.login_activity_id,
    user_id: row.user_id,
    email: row.email,
    firstname: row.user?.firstname ?? null,
    lastname: row.user?.lastname ?? null,
    role_type: row.user?.role.type ?? null,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    source: row.source,
    outcome: row.outcome,
    failure_reason: row.failure_reason,
    created_at: row.createdAt.toISOString(),
  };
}
