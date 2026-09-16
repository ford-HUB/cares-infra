import { Module } from '@nestjs/common';
import { NotificationsSiteController } from '../controllers/notifications-site-controller';
import { NotificationsRepository } from '../repositories/notifications-repository';
import { NotificationsSiteService } from '../services/notifications-site-service';

@Module({
  controllers: [NotificationsSiteController],
  providers: [NotificationsSiteService, NotificationsRepository],
  exports: [NotificationsSiteService, NotificationsRepository],
})
export class NotificationsSiteModule {}
