import { Module } from '@nestjs/common';
import { NotificationsMobileController } from '../controllers/notifications-mobile-controller';
import { NotificationsRepository } from '../repositories/notifications-repository';
import { NotificationsMobileService } from '../services/notifications-mobile-service';

@Module({
  controllers: [NotificationsMobileController],
  providers: [NotificationsMobileService, NotificationsRepository],
  exports: [NotificationsMobileService],
})
export class NotificationsMobileModule {}
