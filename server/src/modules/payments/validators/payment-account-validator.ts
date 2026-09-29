import { DonationPaymentMethod } from '../../../infastructures/prisma/common/client';
import { paymentMethodDescriptor } from '../../../shared/constants/payment-methods';

/**
 * Whether the receiving account the director recorded for a channel is a *plausible*
 * one for that channel. This is the half of "is their payment method correct" that can
 * be answered without a gateway: a GCash account is an 11-digit Philippine mobile
 * number and nothing else, a bank account needs a bank to belong to, and a card
 * channel has no account at all.
 *
 * What it deliberately cannot answer is whether the account is *theirs*. No Xendit API
 * proves ownership of a GCash number; the way that is normally settled is a ₱1 payout
 * to the account and the director confirming it arrived — see `ownershipProofPending`.
 */
export interface PaymentAccountCheck {
  ok: boolean;
  /** The sentence shown on the method card when it is not ok. */
  reason?: string;
}

/** `09171234567` or `+639171234567`, after spaces and dashes are taken out. */
const PH_MOBILE = /^(09\d{9}|\+639\d{9})$/;

/** PH bank account numbers run roughly 8–20 digits depending on the bank. */
const BANK_ACCOUNT = /^\d{8,20}$/;

export function normalizeAccountNumber(value: string | null): string {
  return (value ?? '').replace(/[\s-]/g, '');
}

export function checkPaymentAccount(
  method: DonationPaymentMethod,
  account: { accountNumber: string | null; accountName: string | null },
  channelCodes: readonly string[] = [],
): PaymentAccountCheck {
  const descriptor = paymentMethodDescriptor(method);
  if (!descriptor.collectsAccount) return { ok: true };

  const number = normalizeAccountNumber(account.accountNumber);
  if (!number) {
    return {
      ok: false,
      reason: `Record the ${descriptor.label} account donors will be paying into before offering it.`,
    };
  }

  switch (method) {
    case DonationPaymentMethod.GCASH:
    case DonationPaymentMethod.QRPH:
      if (!PH_MOBILE.test(number)) {
        return {
          ok: false,
          reason: `That is not a Philippine mobile number — a ${descriptor.label} account is 11 digits, e.g. 09171234567.`,
        };
      }
      break;

    case DonationPaymentMethod.BANK_TRANSFER:
      if (!BANK_ACCOUNT.test(number)) {
        return {
          ok: false,
          reason:
            'A bank account number is 8 to 20 digits, with no letters or spaces.',
        };
      }
      // Without a bank, the number names nothing — and the invoice would offer every
      // bank CARES may not even hold an account with.
      if (channelCodes.length === 0) {
        return {
          ok: false,
          reason:
            'Pick the bank this account is held at, so donors are only offered banks CARES can receive from.',
        };
      }
      break;

    default:
      break;
  }

  if (!account.accountName?.trim()) {
    return {
      ok: false,
      reason: `Add the name on the ${descriptor.label} account, so a donor can see who they paid.`,
    };
  }

  return { ok: true };
}

/**
 * The part of account validation that needs money to move: sending a token amount to
 * the recorded account and having the director confirm it arrived. It needs Xendit
 * Disbursements enabled on the account, which CARES does not have yet, so this states
 * the gap rather than pretending the account is proven.
 */
export function ownershipProofPending(method: DonationPaymentMethod): string {
  const descriptor = paymentMethodDescriptor(method);
  return `The ${descriptor.label} details look right, but CARES cannot yet prove the account belongs to it — that needs a test payout, which requires Xendit Disbursements.`;
}
