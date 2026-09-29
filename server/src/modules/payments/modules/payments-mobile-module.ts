import { Module } from '@nestjs/common';
import { PaymentsMobileController } from '../controllers/payments-mobile-controller';
import { PaymentsMobileService } from '../services/payments-mobile-service';
import { PaymentSettingsModule } from './payment-settings-module';

@Module({
  imports: [PaymentSettingsModule],
  controllers: [PaymentsMobileController],
  providers: [PaymentsMobileService],
})
export class PaymentsMobileModule {}
