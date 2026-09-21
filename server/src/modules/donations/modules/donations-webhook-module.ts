import { Module } from '@nestjs/common';
import { DonationsWebhookController } from '../controllers/donations-webhook-controller';
import { DonationsRepository } from '../repositories/donations-repository';
import { DonationsWebhookService } from '../services/donations-webhook-service';

@Module({
  controllers: [DonationsWebhookController],
  providers: [DonationsWebhookService, DonationsRepository],
  exports: [DonationsWebhookService],
})
export class DonationsWebhookModule {}
