import { DonationPaymentMethod } from '../../../infastructures/prisma/common/client';
import { paymentMethodDescriptor } from '../../../shared/constants/payment-methods';

/** Plausibility only (GCash = PH mobile, bank needs a bank, cards none); ownership needs a payout, see `ownershipProofPending`. */
export interface PaymentAccountCheck {
  ok: boolean;
  /** Shown on the method card when not ok. */
  reason?: string;
}

/** After stripping spaces and dashes. */
const PH_MOBILE = /^(09\d{9}|\+639\d{9})$/;

/** Roughly 8–20 digits depending on the bank. */
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
      // Without a bank the number is meaningless, and the invoice would offer every bank.
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

/** Needs Xendit Disbursements, which CARES lacks, so this states the gap. */
export function ownershipProofPending(method: DonationPaymentMethod): string {
  const descriptor = paymentMethodDescriptor(method);
  return `The ${descriptor.label} details look right, but CARES cannot yet prove the account belongs to it — that needs a test payout, which requires Xendit Disbursements.`;
}
