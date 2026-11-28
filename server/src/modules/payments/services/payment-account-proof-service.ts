import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomBytes, randomInt } from 'node:crypto';
import {
  DonationPaymentMethod,
  PaymentAccountProof,
} from '../../../infastructures/prisma/common/client';
import {
  XenditRequestError,
  XenditService,
  type XenditCredentials,
} from '../../../infastructures/xendit/xendit-service';
import { paymentMethodDescriptor } from '../../../shared/constants/payment-methods';
import type { PaymentAccountProofWrite } from '../repositories/payments-repository';
import {
  checkPaymentAccount,
  normalizeAccountNumber,
} from '../validators/payment-account-validator';

/** Small range on purpose: guards against typos, and every peso is real money. */
const PROOF_MIN_AMOUNT = 1;
const PROOF_MAX_AMOUNT = 9;

/** Then a fresh payout is required. */
export const ACCOUNT_PROOF_MAX_ATTEMPTS = 3;

const PAYOUT_CHANNELS: Partial<Record<DonationPaymentMethod, string>> = {
  [DonationPaymentMethod.GCASH]: 'PH_GCASH',
  [DonationPaymentMethod.QRPH]: 'PH_GCASH',
};

/**
 * `/v2/payouts` needs payout codes (`PH_BPI`), not collection codes (`DD_BPI`).
 * `PH_BPI`/`PH_UBP` are confirmed by Xendit; `PH_RCBC`/`PH_CBC` aren't (a wrong code is refused, no money moves).
 */
const BANK_PAYOUT_CHANNELS: Record<string, string> = {
  DD_BPI: 'PH_BPI',
  DD_UBP: 'PH_UBP',
  DD_RCBC: 'PH_RCBC',
  DD_CHINABANK: 'PH_CBC',
};

function payoutChannelFor(
  method: DonationPaymentMethod,
  channelCodes: readonly string[],
): string | undefined {
  const fixed = PAYOUT_CHANNELS[method];
  if (fixed) return fixed;
  if (method !== DonationPaymentMethod.BANK_TRANSFER) return undefined;
  return channelCodes
    .map((code) => BANK_PAYOUT_CHANNELS[code])
    .find((code): code is string => Boolean(code));
}

@Injectable()
export class PaymentAccountProofService {
  private readonly logger = new Logger(PaymentAccountProofService.name);

  constructor(private readonly xendit: XenditService) {}

  /** A refusing gateway (usually Payouts disabled) is recorded as the reason. */
  async start(
    method: DonationPaymentMethod,
    credentials: XenditCredentials | null,
    account: {
      accountNumber: string | null;
      accountName: string | null;
      channelCodes: readonly string[];
    },
  ): Promise<PaymentAccountProofWrite> {
    const descriptor = paymentMethodDescriptor(method);

    const check = checkPaymentAccount(method, account, account.channelCodes);
    if (!check.ok) {
      throw new BadRequestException(check.reason);
    }

    const channelCode = payoutChannelFor(method, account.channelCodes);
    if (!channelCode) {
      throw new BadRequestException(
        `CARES cannot send a test payout to a ${descriptor.label} account.`,
      );
    }

    const amount = randomInt(PROOF_MIN_AMOUNT, PROOF_MAX_AMOUNT + 1);
    const reference = `CARES-VERIFY-${randomBytes(5).toString('hex').toUpperCase()}`;
    const target = normalizeAccountNumber(account.accountNumber);

    if (!credentials) {
      return {
        account_proof: PaymentAccountProof.FAILED,
        account_proof_message:
          'No Xendit account is connected yet, so the test payout could not be sent.',
        account_proof_target: target,
      };
    }

    try {
      const payout = await this.xendit.createPayout(credentials, {
        referenceId: reference,
        channelCode,
        accountNumber: target,
        accountHolderName: account.accountName?.trim() ?? '',
        amount,
        idempotencyKey: reference,
      });

      return {
        account_proof:
          payout.status === 'FAILED'
            ? PaymentAccountProof.FAILED
            : PaymentAccountProof.AWAITING_CONFIRMATION,
        account_proof_amount: amount,
        account_proof_reference: reference,
        account_proof_id: payout.id,
        account_proof_sent_at: new Date(),
        account_proof_attempts: 0,
        account_proof_target: target,
        account_proof_message:
          payout.status === 'FAILED'
            ? `Xendit could not send the payout${payout.failure_code ? ` (${payout.failure_code})` : ''}.`
            : `A test payout is on its way to ${this.mask(target)}. Enter the exact amount that arrives.`,
      };
    } catch (error) {
      const message =
        error instanceof XenditRequestError
          ? this.explain(error)
          : 'The payment gateway could not be reached. Try again in a moment.';
      this.logger.warn(
        `Account proof payout refused for ${method}: ${message}`,
      );

      return {
        account_proof: PaymentAccountProof.FAILED,
        account_proof_message: message,
        account_proof_target: target,
      };
    }
  }

  /** Running out of attempts locks until a fresh payout, so it can't be guessed. */
  confirm(
    row: {
      account_proof: PaymentAccountProof;
      account_proof_amount: number | null;
      account_proof_attempts: number;
    },
    reported: number,
  ): PaymentAccountProofWrite {
    if (
      row.account_proof !== PaymentAccountProof.AWAITING_CONFIRMATION ||
      row.account_proof_amount === null
    ) {
      throw new BadRequestException(
        'There is no test payout waiting to be confirmed. Send one first.',
      );
    }

    if (reported === row.account_proof_amount) {
      return {
        account_proof: PaymentAccountProof.VERIFIED,
        account_verified_at: new Date(),
        // Cleared once proven so the answer doesn't linger.
        account_proof_amount: null,
        account_proof_attempts: 0,
        account_proof_message:
          'Confirmed — the account is reachable by CARES and the amount matched.',
      };
    }

    const attempts = row.account_proof_attempts + 1;
    const left = ACCOUNT_PROOF_MAX_ATTEMPTS - attempts;

    if (left <= 0) {
      return {
        account_proof: PaymentAccountProof.FAILED,
        account_proof_amount: null,
        account_proof_attempts: attempts,
        account_proof_message:
          'That did not match, and there are no attempts left. Send a new test payout to try again.',
      };
    }

    return {
      account_proof: PaymentAccountProof.AWAITING_CONFIRMATION,
      account_proof_attempts: attempts,
      account_proof_message: `That is not the amount CARES sent. ${left} attempt${left === 1 ? '' : 's'} left.`,
    };
  }

  /** Editing the account number retires the old proof. */
  static invalidates(
    proofTarget: string | null,
    accountNumber: string | null,
  ): boolean {
    return normalizeAccountNumber(accountNumber) !== (proofTarget ?? '');
  }

  /** e.g. `0917••••567`. */
  private mask(accountNumber: string): string {
    if (accountNumber.length < 7) return accountNumber;
    return `${accountNumber.slice(0, 4)}••••${accountNumber.slice(-3)}`;
  }

  private explain(error: XenditRequestError): string {
    // Payouts disabled: retrying won't help.
    if (
      error.code.includes('NOT_ACTIVATED') ||
      error.code.includes('FORBIDDEN') ||
      error.status === 403
    ) {
      return 'Xendit has not enabled payouts on this account, so the test payout could not be sent. Request Payouts/Disbursements in the Xendit dashboard.';
    }
    return `Xendit refused the test payout: ${error.message}`;
  }
}
