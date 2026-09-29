import { DonationPaymentMethod } from '../../infastructures/prisma/common/client';

/**
 * The four channels CARES can collect a money donation through, and what each one
 * looks like before the director has changed anything in the Payments module. The
 * portal renders this order, the donor app is sent whichever of them are enabled,
 * and an unconfigured install still has sensible copy.
 *
 * `channelCodes` is the Xendit side: GCash and QR Ph are single-channel products, so
 * they carry none; the card and bank options are hosted invoices limited to the codes
 * listed here unless the director narrows them (e.g. only the banks CARES holds an
 * account with).
 *
 * `gatewayChannelCodes` is what the activation check asks about — the codes Xendit
 * lists on `GET /payment_channels`. `callbackTypes` is which callback URLs have to
 * point at our webhook for this channel to report its payments.
 */
export interface PaymentMethodDescriptor {
  method: DonationPaymentMethod;
  label: string;
  description: string;
  channelCodes: readonly string[];
  gatewayChannelCodes: readonly string[];
  callbackTypes: readonly string[];
  /** Whether the director is expected to record a receiving account for it. */
  collectsAccount: boolean;
  sortOrder: number;
}

export const PAYMENT_METHOD_CATALOG: readonly PaymentMethodDescriptor[] = [
  {
    method: DonationPaymentMethod.GCASH,
    label: 'GCash',
    description: 'Approve the payment in your GCash app',
    channelCodes: [],
    gatewayChannelCodes: ['PH_GCASH'],
    callbackTypes: ['ewallet'],
    collectsAccount: true,
    sortOrder: 0,
  },
  {
    method: DonationPaymentMethod.QRPH,
    label: 'QR Ph',
    description: 'Scan the QR code with any GCash, Maya or bank app',
    channelCodes: [],
    gatewayChannelCodes: ['QRPH'],
    callbackTypes: ['qr_code'],
    collectsAccount: true,
    sortOrder: 1,
  },
  {
    method: DonationPaymentMethod.CARD,
    label: 'Credit/Debit Card',
    description: 'Pay with Visa or Mastercard on a secure page',
    channelCodes: ['CREDIT_CARD'],
    gatewayChannelCodes: ['CREDIT_CARD'],
    callbackTypes: ['invoice'],
    collectsAccount: false,
    sortOrder: 2,
  },
  {
    method: DonationPaymentMethod.BANK_TRANSFER,
    label: 'Bank Transfer',
    description: 'Sign in to your online banking to authorise the transfer',
    channelCodes: ['DD_BPI', 'DD_UBP', 'DD_RCBC', 'DD_CHINABANK'],
    gatewayChannelCodes: ['DD_BPI', 'DD_UBP', 'DD_RCBC', 'DD_CHINABANK'],
    callbackTypes: ['invoice', 'direct_debit'],
    collectsAccount: true,
    sortOrder: 3,
  },
];

/** Every Xendit channel code the portal may tick, for validating what it sends. */
export const PAYMENT_CHANNEL_CODES: readonly string[] = [
  ...new Set(
    PAYMENT_METHOD_CATALOG.flatMap((entry) => [...entry.channelCodes]),
  ),
];

export function paymentMethodDescriptor(
  method: DonationPaymentMethod,
): PaymentMethodDescriptor {
  const found = PAYMENT_METHOD_CATALOG.find((entry) => entry.method === method);
  // Unreachable while the catalog covers the enum; the throw keeps a future channel
  // from silently arriving with no copy and no channel codes.
  if (!found) throw new Error(`No payment method descriptor for ${method}`);
  return found;
}
