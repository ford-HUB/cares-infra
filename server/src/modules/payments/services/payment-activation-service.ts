import { Injectable, Logger } from '@nestjs/common';
import {
  DonationPaymentMethod,
  PaymentMethodVerification,
} from '../../../infastructures/prisma/common/client';
import {
  XenditRequestError,
  XenditService,
  type PaymentChannel,
  type XenditCredentials,
} from '../../../infastructures/xendit/xendit-service';
import { paymentMethodDescriptor } from '../../../shared/constants/payment-methods';
import type { PaymentMethodVerificationWrite } from '../repositories/payments-repository';
import { checkPaymentAccount } from '../validators/payment-account-validator';

/**
 * Xendit activates channels after merchant onboarding, not via API. This checks which
 * channels are active and points their callbacks at our webhook, then records the verdict.
 * With no account connected, the channel stays PENDING and is re-checked later.
 */
@Injectable()
export class PaymentActivationService {
  private readonly logger = new Logger(PaymentActivationService.name);

  constructor(private readonly xendit: XenditService) {}

  async verify(
    method: DonationPaymentMethod,
    credentials: XenditCredentials | null,
    webhookUrl: string,
    account: {
      accountNumber: string | null;
      accountName: string | null;
      channelCodes: readonly string[];
      /** Whether the test payout proved ownership. */
      proven?: boolean;
    } = { accountNumber: null, accountName: null, channelCodes: [] },
  ): Promise<PaymentMethodVerificationWrite> {
    const descriptor = paymentMethodDescriptor(method);

    // Check the account locally first: a typo is wrong regardless of the gateway.
    const accountCheck = checkPaymentAccount(
      method,
      account,
      account.channelCodes,
    );
    if (!accountCheck.ok) {
      return {
        verification: PaymentMethodVerification.FAILED,
        verified_at: null,
        verification_message: accountCheck.reason ?? null,
        verified_channel_codes: [],
      };
    }

    // Not "Active" until ownership is proven by a payout.
    if (descriptor.collectsAccount && !account.proven) {
      return {
        verification: PaymentMethodVerification.PENDING,
        verified_at: null,
        verification_message: `Send the test payout and report the amount that arrives to finish verifying the ${descriptor.label} account.`,
        verified_channel_codes: [],
      };
    }

    if (!credentials) {
      return {
        verification: PaymentMethodVerification.PENDING,
        verified_at: null,
        verification_message:
          'Waiting for the CARES Xendit account to be connected. This method will be activated as soon as it is.',
        verified_channel_codes: [],
      };
    }

    // Always register callbacks; best effort, since some accounts only allow dashboard setup.
    const callbacks = await this.registerCallbacks(
      descriptor.callbackTypes,
      credentials,
      webhookUrl,
    );
    const callbackNote = callbacks.failed.length
      ? ` Set the ${callbacks.failed.join(' and ')} callback URL by hand in the Xendit dashboard — it could not be registered from here.`
      : '';

    let channels: PaymentChannel[];
    try {
      channels = await this.xendit.listPaymentChannels(credentials);
    } catch (error) {
      return {
        verification: PaymentMethodVerification.FAILED,
        verified_at: null,
        verification_message:
          error instanceof XenditRequestError
            ? `Xendit refused the activation check: ${error.message}`
            : 'The payment gateway could not be reached. Check again in a moment.',
        verified_channel_codes: [],
      };
    }

    // Empty list is unknown, not no (sandbox accounts often report none).
    if (channels.length === 0) {
      return {
        verification: PaymentMethodVerification.PENDING,
        verified_at: null,
        verification_message: `Xendit did not list any channels for this account, so ${descriptor.label} could not be confirmed — usual for a test account. Callbacks are set, and a donation will still be attempted.${callbackNote}`,
        verified_channel_codes: [],
        callbacks_registered_at: callbacks.registered ? new Date() : null,
      };
    }

    const byCode = new Map(
      channels.map((channel) => [channel.channelCode, channel.activated]),
    );
    const activated = descriptor.gatewayChannelCodes.filter((code) =>
      byCode.get(code),
    );

    // A real no; only Xendit can change it.
    if (activated.length === 0) {
      return {
        verification: PaymentMethodVerification.FAILED,
        verified_at: null,
        verification_message: `Xendit has not activated ${descriptor.label} on this account yet. Request it in the Xendit dashboard, then check again.`,
        verified_channel_codes: [],
      };
    }

    return {
      verification: PaymentMethodVerification.VERIFIED,
      verified_at: new Date(),
      verification_message: callbacks.failed.length
        ? `Active.${callbackNote}`
        : 'Active — Xendit has this channel switched on and its callbacks point at CARES.',
      verified_channel_codes: activated,
      callbacks_registered_at: callbacks.registered ? new Date() : null,
    };
  }

  private async registerCallbacks(
    types: readonly string[],
    credentials: XenditCredentials,
    webhookUrl: string,
  ): Promise<{ registered: boolean; failed: string[] }> {
    const failed: string[] = [];

    for (const type of types) {
      try {
        await this.xendit.registerCallbackUrl(credentials, type, webhookUrl);
      } catch (error) {
        failed.push(type);
        this.logger.warn(
          `Could not register the ${type} callback URL: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return { registered: failed.length < types.length, failed };
  }
}
