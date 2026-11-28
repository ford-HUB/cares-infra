import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  UserRequestKind,
  UserRequestStatus,
} from '../../../infastructures/prisma/common/client';
import { LoginActivityRecorder } from 'src/modules/login-activity/services/login-activity-recorder';
import { AuthRepository } from '../repositories/auth-repository';

/** `errors[].code` the app maps to the "under review" screen. */
export const ACCOUNT_PENDING_APPROVAL = 'ACCOUNT_PENDING_APPROVAL';
export const ACCOUNT_REJECTED = 'ACCOUNT_REJECTED';

/**
 * Keeps self-registered accounts shut until a director accepts their *_REGISTRATION request.
 * Every mobile session issuer (password or social) checks this. Accounts with no such request pass.
 */
@Injectable()
export class RegistrationApprovalGate {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly loginActivityRecorder: LoginActivityRecorder,
  ) {}

  async assertApproved(
    userId: string,
    attempt: {
      email: string;
      ipAddress?: string;
      userAgent?: string;
      source: 'MOBILE';
    },
  ): Promise<void> {
    const registration =
      await this.authRepository.findRegistrationReview(userId);
    if (!registration || registration.status === UserRequestStatus.ACCEPTED) {
      return;
    }

    const who =
      registration.kind === UserRequestKind.ALUMNI_REGISTRATION
        ? 'alumni'
        : registration.kind === UserRequestKind.PARTNER_BARANGAY_REGISTRATION
          ? 'partner barangay'
          : registration.kind === UserRequestKind.MANUAL_REGISTRATION
            ? 'manual'
            : 'beneficiary';
    const Who = who.charAt(0).toUpperCase() + who.slice(1);
    const rejected = registration.status === UserRequestStatus.REJECTED;
    const message = rejected
      ? `Your ${who} registration was not approved${
          registration.rejection_reason
            ? `: ${registration.rejection_reason}`
            : '.'
        }`
      : `Your ${who} registration is still under review. You can sign in once a director approves it.`;

    await this.loginActivityRecorder.record({
      ...attempt,
      userId,
      outcome: 'RESTRICTED_ACCOUNT',
      failureReason: rejected
        ? `${Who} registration was rejected`
        : `${Who} registration is awaiting director approval`,
    });

    throw new ForbiddenException({
      message,
      errors: [
        {
          path: 'account',
          code: rejected ? ACCOUNT_REJECTED : ACCOUNT_PENDING_APPROVAL,
          message,
        },
      ],
    });
  }
}
