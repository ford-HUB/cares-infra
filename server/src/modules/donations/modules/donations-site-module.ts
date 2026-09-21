import { Module } from '@nestjs/common';
import { DonationsSiteController } from '../controllers/donations-site-controller';
import { DonationsRepository } from '../repositories/donations-repository';
import { DonationsSiteService } from '../services/donations-site-service';

/** `NotificationScheduler` comes from the global schedulers module. */
@Module({
  controllers: [DonationsSiteController],
  providers: [DonationsSiteService, DonationsRepository],
  exports: [DonationsSiteService],
})
export class DonationsSiteModule {}
