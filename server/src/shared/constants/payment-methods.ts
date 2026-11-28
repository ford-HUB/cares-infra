import { DonationPaymentMethod } from '../../infastructures/prisma/common/client';

/**
 * Defaults before the Payments module is configured; the portal renders this order.
 * `channelCodes`: invoice codes for card/bank (GCash and QR Ph need none).
 * `gatewayChannelCodes`: what the activation check asks about (`GET /payment_channels`).
 * `callbackTypes`: callback URLs that must point at our webhook.
 */
export interface PaymentMethodDescriptor {
  method: DonationPaymentMethod;
  label: string;
  description: string;
  channelCodes: readonly string[];
  gatewayChannelCodes: readonly string[];
  callbackTypes: readonly string[];
  /** Expects a receiving account. */
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

/** For validating what the portal sends. */
export const PAYMENT_CHANNEL_CODES: readonly string[] = [
  ...new Set(
    PAYMENT_METHOD_CATALOG.flatMap((entry) => [...entry.channelCodes]),
  ),
];

export function paymentMethodDescriptor(
  method: DonationPaymentMethod,
): PaymentMethodDescriptor {
  const found = PAYMENT_METHOD_CATALOG.find((entry) => entry.method === method);
  // Guards a future enum value missing from the catalog.
  if (!found) throw new Error(`No payment method descriptor for ${method}`);
  return found;
}
