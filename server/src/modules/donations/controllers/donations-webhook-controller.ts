import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Public } from 'src/shared/decorators/public-decorator';
import { XenditService } from '../../../infastructures/xendit/xendit-service';
import { PaymentSettingsService } from '../../payments/services/payment-settings-service';
import { DonationsWebhookService } from '../services/donations-webhook-service';

/**
 * Register in Xendit (Settings → Callbacks) for eWallets, QR codes and Invoices:
 *   {API_PUBLIC_URL}/api/v1/donations/webhooks/xendit
 * Token from the Payments module (fallback XENDIT_WEBHOOK_TOKEN). Xendit retries non-2xx,
 * so a bad token is 401 and handled/duplicate events are 200.
 */
@Controller('v1/donations/webhooks')
export class DonationsWebhookController {
  constructor(
    private readonly xendit: XenditService,
    private readonly paymentSettings: PaymentSettingsService,
    private readonly donationsWebhookService: DonationsWebhookService,
  ) {}

  @Post('xendit')
  @Public()
  @HttpCode(200)
  async receive(
    @Body() body: Record<string, unknown>,
    @Headers('x-callback-token') callbackToken?: string,
    @Headers('webhook-id') webhookId?: string,
  ): Promise<{ result: string }> {
    const expected = await this.paymentSettings.callbackToken();
    if (!this.xendit.isCallbackTokenValid(callbackToken, expected)) {
      throw new UnauthorizedException('Invalid callback token');
    }
    // No `webhook-id`: dedupe on the payload's resource id.
    const id = webhookId?.trim() || this.fallbackId(body);
    const result = await this.donationsWebhookService.handle(id, body);
    return { result };
  }

  private fallbackId(body: Record<string, unknown>): string {
    const data =
      body.data && typeof body.data === 'object'
        ? (body.data as Record<string, unknown>)
        : body;
    const resource = typeof data.id === 'string' ? data.id : 'unknown';
    const status = typeof data.status === 'string' ? data.status : 'unknown';
    return `${resource}:${status}`;
  }
}
