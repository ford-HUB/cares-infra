import { Module } from '@nestjs/common';
import { DonationsMobileModule } from './donations-mobile-module';
import { DonationsSiteModule } from './donations-site-module';
import { DonationsWebhookModule } from './donations-webhook-module';

/**
 * Donors open Xendit checkouts and pledge goods from the app; Xendit reports
 * settlements to the webhook; the portal walks the ledger to confirmed.
 */
@Module({
  imports: [DonationsMobileModule, DonationsSiteModule, DonationsWebhookModule],
})
export class DonationsModule {}
