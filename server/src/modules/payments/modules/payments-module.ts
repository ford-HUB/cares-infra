import { Module } from '@nestjs/common';
import { PaymentSettingsModule } from './payment-settings-module';
import { PaymentsMobileModule } from './payments-mobile-module';
import { PaymentsSiteModule } from './payments-site-module';

/** Config lives in the global `PaymentSettingsModule`. */
@Module({
  imports: [PaymentSettingsModule, PaymentsSiteModule, PaymentsMobileModule],
})
export class PaymentsModule {}
