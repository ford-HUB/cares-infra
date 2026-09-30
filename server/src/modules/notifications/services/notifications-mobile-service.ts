import { Injectable, NotFoundException } from '@nestjs/common';
import type { JwtPayload } from '../../../shared/types/jwt-payload';
import type {
  ListMobileNotificationsQueryDto,
  MarkAllMobileNotificationsReadQueryDto,
  MobileNotificationFeedDto,
} from '../dto/notifications-mobile-dto';
import { NotificationsRepository } from '../repositories/notifications-repository';
import { toNotificationDto } from './notifications-site-service';
import { MOBILE_NOTIFICATIONS_DEFAULT_LIMIT } from '../validators/notifications-mobile-validator';

/**
 * The app's read side of a person's own feed. The app has no socket — it polls
 * this on resume and surfaces anything new as a device notification — so unlike
 * the portal service nothing here pushes a count anywhere.
 */
@Injectable()
export class NotificationsMobileService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async listNotifications(
    caller: JwtPayload,
    query: ListMobileNotificationsQueryDto,
  ): Promise<MobileNotificationFeedDto> {
    const [rows, counts] = await Promise.all([
      this.notificationsRepository.listForUser(
        caller.sub,
        query.limit,
        query.role,
      ),
      this.notificationsRepository.countForUser(caller.sub, query.role),
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
  ): Promise<MobileNotificationFeedDto> {
    const row = await this.notificationsRepository.findForUser(
      caller.sub,
      notificationId,
    );
    if (!row) throw new NotFoundException('Notification not found');
    await this.notificationsRepository.markRead(caller.sub, notificationId);
    return this.reload(caller);
  }

  /**
   * "Mark all as read" on one side of the account leaves the other sides'
   * unread rows alone — they have not been seen yet.
   */
  async markAllRead(
    caller: JwtPayload,
    query: MarkAllMobileNotificationsReadQueryDto = {},
  ): Promise<MobileNotificationFeedDto> {
    await this.notificationsRepository.markAllRead(caller.sub, query.role);
    return this.reload(caller);
  }

  private reload(caller: JwtPayload): Promise<MobileNotificationFeedDto> {
    return this.listNotifications(caller, {
      limit: MOBILE_NOTIFICATIONS_DEFAULT_LIMIT,
    });
  }
}
