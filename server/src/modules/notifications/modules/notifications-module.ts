import { Module } from '@nestjs/common';
import { NotificationsSiteModule } from './notifications-site-module';

/**
 * Site-only: the portal inbox. Writing goes through the notification scheduler in
 * `src/schedulers`, which fans a role-addressed notice out to rows here. The mobile
 * app has its own push channel and does not read this table.
 */
@Module({
  imports: [NotificationsSiteModule],
  exports: [NotificationsSiteModule],
})
export class NotificationsModule {}
