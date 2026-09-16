import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationGateway } from '../../../gateways/notification.gateway';
import type { JwtPayload } from '../../../shared/types/jwt-payload';
import type {
  ListNotificationsQueryDto,
  NotificationDto,
  NotificationFeedDto,
} from '../dto/notifications-site-dto';
import {
  NotificationsRepository,
  type NotificationRow,
} from '../repositories/notifications-repository';

/**
 * The read side of a user's own feed. Every method is scoped to the caller — there is
 * no way to read or change anyone else's rows through here. Writes push the new unread
 * count over the socket so a second tab's bell agrees with the one that clicked.
 */
@Injectable()
export class NotificationsSiteService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async listNotifications(
    caller: JwtPayload,
    query: ListNotificationsQueryDto,
  ): Promise<NotificationFeedDto> {
    const [rows, counts] = await Promise.all([
      this.notificationsRepository.listForUser(caller.sub, query.limit),
      this.notificationsRepository.countForUser(caller.sub),
    ]);

    return {
      summary: {
        total: counts.total,
        unread: counts.unread,
        read: counts.total - counts.unread,
      },
      items: rows.map(toNotificationDto),
    };
  }

  async markRead(
    caller: JwtPayload,
    notificationId: string,
  ): Promise<NotificationFeedDto> {
    await this.requireOwn(caller, notificationId);
    await this.notificationsRepository.markRead(caller.sub, notificationId);
    return this.reload(caller);
  }

  async markAllRead(caller: JwtPayload): Promise<NotificationFeedDto> {
    await this.notificationsRepository.markAllRead(caller.sub);
    return this.reload(caller);
  }

  async dismiss(
    caller: JwtPayload,
    notificationId: string,
  ): Promise<NotificationFeedDto> {
    await this.requireOwn(caller, notificationId);
    await this.notificationsRepository.dismiss(caller.sub, notificationId);
    return this.reload(caller);
  }

  async clearRead(caller: JwtPayload): Promise<NotificationFeedDto> {
    await this.notificationsRepository.dismissRead(caller.sub);
    return this.reload(caller);
  }

  private async requireOwn(
    caller: JwtPayload,
    notificationId: string,
  ): Promise<NotificationRow> {
    const row = await this.notificationsRepository.findForUser(
      caller.sub,
      notificationId,
    );
    if (!row) {
      throw new NotFoundException('Notification not found');
    }
    return row;
  }

  private async reload(caller: JwtPayload): Promise<NotificationFeedDto> {
    const feed = await this.listNotifications(caller, { limit: 200 });
    this.notificationGateway.emitUnread(caller.sub, feed.summary.unread);
    return feed;
  }
}

export function toNotificationDto(row: NotificationRow): NotificationDto {
  return {
    notification_id: row.notification_id,
    title: row.title,
    description: row.description,
    category: row.category,
    tone: row.tone,
    href: row.href,
    read: row.read_at !== null,
    created_at: row.createdAt.toISOString(),
  };
}
