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

/**
 * Proves the director holds the account a channel pays into, the way banks have always
 * done it: send a small amount of a number nobody can guess, and ask what arrived.
 *
 * The range is deliberately small — this guards against a mistyped account number by
 * someone CARES already trusts, not against an attacker, and every peso is real money
 * leaving the CARES balance.
 */
const PROOF_MIN_AMOUNT = 1;
const PROOF_MAX_AMOUNT = 9;

/** Wrong answers before the proof locks and a fresh payout is required. */
export const ACCOUNT_PROOF_MAX_ATTEMPTS = 3;

/** Which Xendit payout channel each method's account lives on. */
const PAYOUT_CHANNELS: Partial<Record<DonationPaymentMethod, string>> = {
  [DonationPaymentMethod.GCASH]: 'PH_GCASH',
  [DonationPaymentMethod.QRPH]: 'PH_GCASH',
};

@Injectable()
export class PaymentAccountProofService {
  private readonly logger = new Logger(PaymentAccountProofService.name);

  constructor(private readonly xendit: XenditService) {}

  /**
   * Starts a proof: picks the amount, sends the payout, and leaves the channel waiting
   * for the director to report what landed. A gateway that will not send — Payouts not
   * enabled on the account, most often — is recorded as the reason rather than as a
   * verified account.
   */
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

    const channelCode = PAYOUT_CHANNELS[method] ?? account.channelCodes[0];
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

  /**
   * The director reports what arrived. A wrong answer costs an attempt; running out
   * locks the proof, and only a fresh payout reopens it — otherwise the amount could
   * simply be guessed through.
   */
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
        // Cleared on purpose: once proven, the answer is of no further use and should
        // not sit in the database for the next person to read.
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

  /** Editing the account number retires whatever the old number proved. */
  static invalidates(
    proofTarget: string | null,
    accountNumber: string | null,
  ): boolean {
    return normalizeAccountNumber(accountNumber) !== (proofTarget ?? '');
  }

  /** `0917••••567` — enough to recognise the number, not enough to publish it. */
  private mask(accountNumber: string): string {
    if (accountNumber.length < 7) return accountNumber;
    return `${accountNumber.slice(0, 4)}••••${accountNumber.slice(-3)}`;
  }

  private explain(error: XenditRequestError): string {
    // The one refusal worth naming: CARES cannot send money until Xendit turns payouts
    // on for the account, and no amount of retrying changes that.
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
