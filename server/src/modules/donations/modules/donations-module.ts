import { Module } from '@nestjs/common';
import { DonationsMobileModule } from './donations-mobile-module';
import { DonationsSiteModule } from './donations-site-module';
import { DonationsWebhookModule } from './donations-webhook-module';

/** Site module first: its literal `site/…` routes must register before mobile's `:id`. */
@Module({
  imports: [DonationsSiteModule, DonationsMobileModule, DonationsWebhookModule],
})
export class DonationsModule {}
