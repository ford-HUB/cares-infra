import { Global, Module } from '@nestjs/common';
import { PaymentsRepository } from '../repositories/payments-repository';
import { PaymentSettingsService } from '../services/payment-settings-service';

/**
 * The gateway config on its own, global and provided exactly once: the checkout, the
 * status reconcile, the webhook's token check and both payment controllers must see the
 * *same* `PaymentSettingsService` instance, because that instance holds the cached copy
 * a save invalidates. Declaring the provider in each module would give each one its own
 * cache, and a save would then be invisible to the others until their TTL lapsed.
 */
@Global()
@Module({
  providers: [PaymentSettingsService, PaymentsRepository],
  exports: [PaymentSettingsService, PaymentsRepository],
})
export class PaymentSettingsModule {}
