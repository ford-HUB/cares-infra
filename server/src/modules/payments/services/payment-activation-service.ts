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
 * What switching a payment method on actually does with the gateway.
 *
 * Xendit does not let an API call *sign CARES up* for GCash: a channel is activated
 * by Xendit for the merchant after their own onboarding. What can be done from here,
 * and what this service does, is the rest of it:
 *
 *   1. ask Xendit which channels the account has activated, and
 *   2. point the callback URLs for that channel at our webhook,
 *
 * then record the verdict on the channel so the portal can say "active", "waiting" or
 * exactly what the gateway refused. Until an account is connected, step 1 has nothing
 * to ask, so the channel is parked at PENDING and the same check re-runs later.
 */
@Injectable()
export class PaymentActivationService {
  private readonly logger = new Logger(PaymentActivationService.name);

  constructor(private readonly xendit: XenditService) {}

  /** The verdict for one channel, ready to be written onto its row. */
  async verify(
    method: DonationPaymentMethod,
    credentials: XenditCredentials | null,
    webhookUrl: string,
    account: {
      accountNumber: string | null;
      accountName: string | null;
      channelCodes: readonly string[];
      /** Whether the test payout proved CARES holds this account. */
      proven?: boolean;
    } = { accountNumber: null, accountName: null, channelCodes: [] },
  ): Promise<PaymentMethodVerificationWrite> {
    const descriptor = paymentMethodDescriptor(method);

    // The account CARES will be paid into is checked first, and without the gateway:
    // a channel pointing at a mistyped number is wrong however healthy Xendit is, and
    // the director should hear about the typo rather than about the gateway.
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

    // Ownership is proven by a payout, not by the channel being live: a channel Xendit
    // has activated still must not be called "Active" while CARES cannot show the
    // account it pays into is its own.
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

    // Done first, and regardless of what the channel list says: the callbacks are
    // ours to set, and a channel Xendit cannot report on still has to be able to
    // report its payments. Best effort — an account that only allows callbacks to be
    // set in the dashboard must not hold a channel back.
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

    // An empty list is Xendit saying nothing, not saying no — test accounts routinely
    // report no channels while sandbox charges work perfectly. Claiming the channel is
    // dead on that basis would make the screen unusable in development, so it reads as
    // "could not confirm" and the first real donation is what proves it.
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

    // The account reported its channels and this one is not among the live ones —
    // that is a real no, and only Xendit can change it.
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
