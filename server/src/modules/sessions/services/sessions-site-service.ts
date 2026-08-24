import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isProtectedAdminEmail } from '../../../shared/constants/protected-admin';
import type { RequestContextDto } from '../../../shared/decorators/request-context-decorator';
import type { JwtPayload } from '../../../shared/types/jwt-payload';
import { AuditLogRecorder } from '../../audit-logs/services/audit-log-recorder';
import type { RoleType } from '../../../infastructures/prisma/common/client';
import type {
  ActiveSessionDto,
  ListSessionsQueryDto,
  RevokeSessionsDto,
  SessionsPageDto,
} from '../dto/sessions-site-dto';
import {
  SessionRepository,
  type SessionUserRow,
} from '../repositories/session-repository';
import { SessionRegistry, type SessionRecord } from './session-registry';

/** Splits the two halves of a `{signed-in timestamp}_{session id}` cursor. */
const CURSOR_SEPARATOR = '_';

@Injectable()
export class SessionsSiteService {
  constructor(
    private readonly sessionRegistry: SessionRegistry,
    private readonly sessionRepository: SessionRepository,
    private readonly configService: ConfigService,
    private readonly auditLogRecorder: AuditLogRecorder,
  ) {}

  async listSessions(
    caller: JwtPayload,
    query: ListSessionsQueryDto,
  ): Promise<SessionsPageDto> {
    const sessions = await this.sessionRegistry.listAll();
    const users = await this.loadUsers(sessions);

    // `listAll` already sorts newest sign-in first, which is the order the cursor
    // walks; the account rows only fill in names and roles.
    const matched = sessions
      .map((session) =>
        toActiveSession(session, users.get(session.user_id), caller.sid),
      )
      .filter((row) => matchesQuery(row, query));

    const start = query.cursor ? indexAfterCursor(matched, query.cursor) : 0;
    const items = matched.slice(start, start + query.limit);
    const last = items.at(-1);
    const exhausted = start + items.length >= matched.length;

    return {
      items,
      total: matched.length,
      next_cursor: exhausted || !last ? null : cursorOf(last),
    };
  }

  async revokeSession(
    caller: JwtPayload,
    sessionId: string,
    context: RequestContextDto = {},
  ): Promise<RevokeSessionsDto> {
    const session = await this.sessionRegistry.find(sessionId);
    if (!session) {
      throw new NotFoundException('That session has already ended');
    }

    this.assertMayRevoke(caller, session.user_id, session.email);
    await this.sessionRegistry.revoke(sessionId);

    const own = session.user_id === caller.sub;

    await this.auditLogRecorder.record({
      action: 'session.revoked',
      description: own
        ? 'Signed out one of their own devices'
        : `Signed out a device of ${session.email}`,
      category: 'AUTHENTICATION',
      // Ending someone else's session is an intervention; ending your own is not.
      severity: own ? 'INFO' : 'NOTICE',
      actor: caller,
      targetType: 'session',
      targetLabel: session.email,
      targetId: sessionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        session_source: session.source,
        // Where the revoked session itself signed in from — not where the
        // administrator was sitting, which the entry already records.
        session_ip: session.ip_address,
      },
    });

    return { revoked: 1 };
  }

  async revokeUserSessions(
    caller: JwtPayload,
    userId: string,
    keepCurrent: boolean,
    context: RequestContextDto = {},
  ): Promise<RevokeSessionsDto> {
    const sessions = await this.sessionRegistry.listAll();
    const owned = sessions.filter((session) => session.user_id === userId);
    if (owned.length === 0) {
      throw new NotFoundException('That account has no active sessions');
    }

    this.assertMayRevoke(caller, userId, owned[0].email);

    const revoked = await this.sessionRegistry.revokeAllForUser(
      userId,
      keepCurrent ? caller.sid : undefined,
    );

    await this.auditLogRecorder.record({
      action: 'session.revoked-all',
      description: `Signed out ${revoked} device${revoked === 1 ? '' : 's'} of ${owned[0].email}`,
      category: 'AUTHENTICATION',
      severity: userId === caller.sub ? 'INFO' : 'WARNING',
      actor: caller,
      targetType: 'user',
      targetLabel: owned[0].email,
      targetId: userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        revoked: String(revoked),
        kept_current: String(keepCurrent),
      },
    });

    return { revoked };
  }

  /**
   * The root administrator is the account that can always reach the portal, so no
   * other admin may sign it out. Signing yourself out is always allowed.
   */
  private assertMayRevoke(
    caller: JwtPayload,
    ownerId: string,
    ownerEmail: string,
  ): void {
    if (ownerId === caller.sub) {
      return;
    }

    if (isProtectedAdminEmail(ownerEmail, this.configService)) {
      throw new ForbiddenException(
        'Sessions of the root administrator cannot be revoked',
      );
    }
  }

  private async loadUsers(
    sessions: SessionRecord[],
  ): Promise<Map<string, SessionUserRow>> {
    const userIds = [...new Set(sessions.map((session) => session.user_id))];
    const users = await this.sessionRepository.findUsers(userIds);

    return new Map(users.map((user) => [user.user_id, user]));
  }
}

function cursorOf(row: ActiveSessionDto): string {
  return `${row.created_at}${CURSOR_SEPARATOR}${row.session_id}`;
}

/**
 * Where the next page starts. The cursor is compared by value rather than looked up by
 * id, so a page still lands in the right place when the session it points at was
 * revoked — or expired — between requests.
 */
function indexAfterCursor(rows: ActiveSessionDto[], cursor: string): number {
  const separator = cursor.indexOf(CURSOR_SEPARATOR);
  if (separator === -1) {
    return 0;
  }

  const createdAt = cursor.slice(0, separator);
  const sessionId = cursor.slice(separator + 1);
  const cursorTime = new Date(createdAt).getTime();
  if (Number.isNaN(cursorTime)) {
    return 0;
  }

  const index = rows.findIndex((row) => {
    const rowTime = new Date(row.created_at).getTime();
    // Rows are newest first, so "after the cursor" means older — or equally old with a
    // higher id, which is how `listAll` breaks ties.
    return (
      rowTime < cursorTime ||
      (rowTime === cursorTime && row.session_id.localeCompare(sessionId) > 0)
    );
  });

  return index === -1 ? rows.length : index;
}

function toActiveSession(
  session: SessionRecord,
  user: SessionUserRow | undefined,
  callerSessionId?: string,
): ActiveSessionDto {
  return {
    session_id: session.session_id,
    user_id: session.user_id,
    email: session.email,
    firstname: user?.firstname ?? null,
    lastname: user?.lastname ?? null,
    avatar: user?.avatar ?? null,
    department: user?.portal_department ?? null,
    // The record's copy is what the token was signed with; the account row wins when
    // the role changed after sign-in.
    role_type: (user?.role.type as RoleType) ?? session.role_type,
    is_restricted: user?.is_restricted ?? false,
    ip_address: session.ip_address,
    user_agent: session.user_agent,
    source: session.source,
    created_at: session.created_at,
    last_seen_at: session.last_seen_at,
    expires_at: session.expires_at,
    is_current: session.session_id === callerSessionId,
  };
}

function matchesQuery(
  row: ActiveSessionDto,
  query: ListSessionsQueryDto,
): boolean {
  if (query.source !== 'all' && row.source !== query.source) {
    return false;
  }

  if (query.role !== 'all' && row.role_type !== query.role) {
    return false;
  }

  const search = query.search?.trim().toLowerCase();
  if (!search) {
    return true;
  }

  const name = `${row.firstname ?? ''} ${row.lastname ?? ''}`.toLowerCase();
  return (
    row.email.toLowerCase().includes(search) ||
    row.ip_address.toLowerCase().includes(search) ||
    name.includes(search)
  );
}
