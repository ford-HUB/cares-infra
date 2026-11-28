import { Global, Module } from '@nestjs/common';
import { PaymentsRepository } from '../repositories/payments-repository';
import { PaymentSettingsService } from '../services/payment-settings-service';

/** Global single instance so every reader shares the cache a save invalidates. */
@Global()
@Module({
  providers: [PaymentSettingsService, PaymentsRepository],
  exports: [PaymentSettingsService, PaymentsRepository],
})
export class PaymentSettingsModule {}
