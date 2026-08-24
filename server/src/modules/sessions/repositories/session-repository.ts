import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

/** The account details a session record does not carry, resolved for the list view. */
export interface SessionUserRow {
  user_id: string;
  firstname: string;
  lastname: string;
  avatar: string | null;
  portal_department: string | null;
  is_restricted: boolean;
  role: { type: string };
}

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** One query for the whole page of sessions, rather than a lookup per row. */
  async findUsers(userIds: string[]): Promise<SessionUserRow[]> {
    if (userIds.length === 0) {
      return [];
    }

    return this.prisma.user.findMany({
      where: { user_id: { in: userIds } },
      select: {
        user_id: true,
        firstname: true,
        lastname: true,
        avatar: true,
        portal_department: true,
        is_restricted: true,
        role: { select: { type: true } },
      },
    });
  }
}
