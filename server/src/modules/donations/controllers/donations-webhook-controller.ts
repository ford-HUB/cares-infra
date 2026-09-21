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
import { DonationsWebhookService } from '../services/donations-webhook-service';

/**
 * Xendit's callback URL. Register it once in the Xendit dashboard
 * (Settings → Callbacks) for *eWallets*, *QR codes* and *Invoices*:
 *
 *   {API_PUBLIC_URL}/api/v1/donations/webhooks/xendit
 *
 * The dashboard's callback verification token goes in XENDIT_WEBHOOK_TOKEN.
 * Xendit retries on anything but a 2xx, so a rejected token answers 401 and a
 * handled or duplicate event always answers 200.
 */
@Controller('v1/donations/webhooks')
export class DonationsWebhookController {
  constructor(
    private readonly xendit: XenditService,
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
    if (!this.xendit.isCallbackTokenValid(callbackToken)) {
      throw new UnauthorizedException('Invalid callback token');
    }
    // Every Xendit callback carries `webhook-id`; without it there is nothing
    // to dedupe on, so fall back to the resource id inside the payload.
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
