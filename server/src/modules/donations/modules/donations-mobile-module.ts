import { Module } from '@nestjs/common';
import { RankingsCoreModule } from '../../rankings/modules/rankings-core-module';
import { DonationsMobileController } from '../controllers/donations-mobile-controller';
import { DonationsRepository } from '../repositories/donations-repository';
import { DonationsMobileService } from '../services/donations-mobile-service';
import { DonationsWebhookModule } from './donations-webhook-module';

/**
 * Status polling reuses the webhook service's status mappers to reconcile with
 * Xendit; goods pledges read the ranking settings for the credited goods values.
 */
@Module({
  imports: [DonationsWebhookModule, RankingsCoreModule],
  controllers: [DonationsMobileController],
  providers: [DonationsMobileService, DonationsRepository],
  exports: [DonationsMobileService],
})
export class DonationsMobileModule {}
