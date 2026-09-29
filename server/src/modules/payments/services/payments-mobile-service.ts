import { Injectable } from '@nestjs/common';
import type { AvailablePaymentMethodsDto } from '../dto/payments-mobile-dto';
import { PaymentSettingsService } from './payment-settings-service';

/**
 * What the donor app is allowed to offer. The app renders exactly what comes back —
 * a channel the director has not enabled never reaches the method step, and the same
 * config refuses it server-side if it is posted anyway.
 */
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
