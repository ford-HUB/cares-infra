import { Injectable } from '@nestjs/common';
import type { AvailablePaymentMethodsDto } from '../dto/payments-mobile-dto';
import { PaymentSettingsService } from './payment-settings-service';

/** The app renders exactly this; the config also refuses disabled channels server-side. */
@Injectable()
export class PaymentsMobileService {
  constructor(private readonly paymentSettings: PaymentSettingsService) {}

  async listAvailableMethods(): Promise<AvailablePaymentMethodsDto> {
    const config = await this.paymentSettings.getConfig();
    const live = config.enabled && Boolean(config.credentials);

    return {
      accepting_payments: live,
      support_email: config.supportEmail,
      support_contact: config.supportContact,
      items: live
        ? config.methods
            .filter((channel) => channel.offerable)
            .map((channel) => ({
              method: channel.method,
              label: channel.label,
              description: channel.description,
              account_name: channel.accountName,
              account_number: channel.accountNumber,
              min_amount: channel.minAmount,
              max_amount: channel.maxAmount,
            }))
        : [],
    };
  }
}
