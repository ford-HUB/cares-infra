import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type Notification,
  type NotificationCategory,
  type NotificationTone,
  type RoleType,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

export type NotificationRow = Notification;

export interface CreateNotificationRowInput {
  userId: string;
  title: string;
  description: string;
  category: NotificationCategory;
  tone: NotificationTone;
  href: string | null;
  dedupeKey: string | null;
}

/** Live rows only — a dismissed notification is gone from every list and count. */
function visibleTo(userId: string): Prisma.NotificationWhereInput {
  return { user_id: userId, dismissed_at: null };
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, limit: number): Promise<NotificationRow[]> {
    return this.prisma.notification.findMany({
      where: visibleTo(userId),
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async countForUser(
    userId: string,
  ): Promise<{ total: number; unread: number }> {
    const [total, unread] = await Promise.all([
      this.prisma.notification.count({ where: visibleTo(userId) }),
      this.prisma.notification.count({
        where: { ...visibleTo(userId), read_at: null },
      }),
    ]);
    return { total, unread };
  }

  async findForUser(
    userId: string,
    notificationId: string,
  ): Promise<NotificationRow | null> {
    return this.prisma.notification.findFirst({
      where: { ...visibleTo(userId), notification_id: notificationId },
    });
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        ...visibleTo(userId),
        notification_id: notificationId,
        read_at: null,
      },
      data: { read_at: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { ...visibleTo(userId), read_at: null },
      data: { read_at: new Date() },
    });
    return result.count;
  }

  async dismiss(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { ...visibleTo(userId), notification_id: notificationId },
      data: { dismissed_at: new Date() },
    });
  }

  async dismissRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { ...visibleTo(userId), read_at: { not: null } },
      data: { dismissed_at: new Date() },
    });
    return result.count;
  }

  /**
   * Who a role-addressed notice reaches: every unrestricted account holding one of
   * the roles. Restricted accounts cannot sign in, so a row for them is noise.
   */
  async findRecipientIdsByRoles(roles: RoleType[]): Promise<string[]> {
    if (roles.length === 0) return [];

    const accounts = await this.prisma.account.findMany({
      where: {
        is_restricted: false,
        user: { role: { type: { in: roles } } },
      },
      select: { user_id: true },
      distinct: ['user_id'],
    });
    return accounts.map((account) => account.user_id);
  }

  /**
   * One insert for the whole fan-out. `skipDuplicates` is what makes the dedupe key
   * work: a recipient who already has this key keeps their existing row untouched.
   */
  async createMany(
    rows: CreateNotificationRowInput[],
  ): Promise<NotificationRow[]> {
    if (rows.length === 0) return [];

    return this.prisma.notification.createManyAndReturn({
      data: rows.map((row) => ({
        user_id: row.userId,
        title: row.title,
        description: row.description,
        category: row.category,
        tone: row.tone,
        href: row.href,
        dedupe_key: row.dedupeKey,
      })),
      skipDuplicates: true,
    });
  }

  /** Housekeeping: rows nobody will read again. Returns how many went. */
  async purgeSettledBefore(cutoff: Date): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        OR: [{ dismissed_at: { lt: cutoff } }, { read_at: { lt: cutoff } }],
      },
    });
    return result.count;
  }
}
