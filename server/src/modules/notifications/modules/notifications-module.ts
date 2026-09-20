import { Module } from '@nestjs/common';
import { NotificationsMobileModule } from './notifications-mobile-module';
import { NotificationsSiteModule } from './notifications-site-module';

/**
 * One table, two readers: the portal inbox and the app's feed. Writing goes
 * through the notification scheduler in `src/schedulers`, which fans a notice out
 * to one row per recipient; the app polls its side and turns new rows into device
 * notifications.
 */
@Module({
  imports: [NotificationsSiteModule, NotificationsMobileModule],
  exports: [NotificationsSiteModule, NotificationsMobileModule],
})
export class NotificationsModule {}
