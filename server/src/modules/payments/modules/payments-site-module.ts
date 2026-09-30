import { Module } from '@nestjs/common';
import { PaymentsSiteController } from '../controllers/payments-site-controller';
import { PaymentAccountProofService } from '../services/payment-account-proof-service';
import { PaymentActivationService } from '../services/payment-activation-service';
import { PaymentsSiteService } from '../services/payments-site-service';
import { PaymentSettingsModule } from './payment-settings-module';

@Module({
  imports: [PaymentSettingsModule],
  controllers: [PaymentsSiteController],
  providers: [
    PaymentsSiteService,
    PaymentActivationService,
    PaymentAccountProofService,
  ],
  exports: [PaymentsSiteService],
})
export class PaymentsSiteModule {}
