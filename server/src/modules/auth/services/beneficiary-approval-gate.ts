import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRequestStatus } from '../../../infastructures/prisma/common/client';
import { LoginActivityRecorder } from 'src/modules/login-activity/services/login-activity-recorder';
import { AuthRepository } from '../repositories/auth-repository';

/** `errors[].code` on the 403s the app turns into the "under review" screen. */
export const ACCOUNT_PENDING_APPROVAL = 'ACCOUNT_PENDING_APPROVAL';
export const ACCOUNT_REJECTED = 'ACCOUNT_REJECTED';

/**
 * A beneficiary who signs up on the app gets an account that stays shut until a
 * director accepts its BENEFICIARY_REGISTRATION request. Every door that hands out a
 * mobile session — password or social provider — asks this gate first. Accounts with
 * no such request (created before the review existed, or by another role) pass.
 */
@Injectable()
export class BeneficiaryApprovalGate {
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
      await this.authRepository.findBeneficiaryRegistration(userId);
    if (!registration || registration.status === UserRequestStatus.ACCEPTED) {
      return;
    }

    const rejected = registration.status === UserRequestStatus.REJECTED;
    const message = rejected
      ? `Your beneficiary registration was not approved${
          registration.rejection_reason
            ? `: ${registration.rejection_reason}`
            : '.'
        }`
      : 'Your beneficiary registration is still under review. You can sign in once a director approves it.';

    await this.loginActivityRecorder.record({
      ...attempt,
      userId,
      outcome: 'RESTRICTED_ACCOUNT',
      failureReason: rejected
        ? 'Beneficiary registration was rejected'
        : 'Beneficiary registration is awaiting director approval',
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
