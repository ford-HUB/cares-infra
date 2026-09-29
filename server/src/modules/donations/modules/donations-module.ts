import { Module } from '@nestjs/common';
import { DonationsMobileModule } from './donations-mobile-module';
import { DonationsSiteModule } from './donations-site-module';
import { DonationsWebhookModule } from './donations-webhook-module';

/**
 * Donors open Xendit checkouts and pledge goods from the app; Xendit reports
 * settlements to the webhook; the portal walks the ledger to confirmed.
 *
 * Both controllers sit under `v1/donations`, and Express matches routes in
 * registration order — so the site module goes first: its literal `site/…`
 * paths must be registered before the mobile module's `:id` routes, or
 * `GET /donations/site` is swallowed by `GET /donations/:id` and the portal
 * gets a 403 from the donor-only role check.
 */
@Module({
  imports: [DonationsSiteModule, DonationsMobileModule, DonationsWebhookModule],
})
export class DonationsModule {}
