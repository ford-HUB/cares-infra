import { Module } from '@nestjs/common';
import { PaymentSettingsModule } from './payment-settings-module';
import { PaymentsMobileModule } from './payments-mobile-module';
import { PaymentsSiteModule } from './payments-site-module';

/**
 * The director enters the Xendit account here; the donations module spends it. The
 * config itself lives in the global `PaymentSettingsModule` so every reader shares one
 * instance — see the note there.
 */
@Module({
  imports: [PaymentSettingsModule, PaymentsSiteModule, PaymentsMobileModule],
})
export class PaymentsModule {}
