import { Module } from '@nestjs/common';
import { NotificationsMobileModule } from './notifications-mobile-module';
import { NotificationsSiteModule } from './notifications-site-module';

/** Read by the portal inbox and the app feed; written via the notification scheduler (one row per recipient). */
@Module({
  imports: [NotificationsSiteModule, NotificationsMobileModule],
  exports: [NotificationsSiteModule, NotificationsMobileModule],
})
export class NotificationsModule {}
