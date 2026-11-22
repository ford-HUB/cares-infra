import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InterestCode } from '../../../infastructures/prisma/common/client';
import { toMobileRole } from '../../../shared/constants/mobile-role-types';
import { UserInterestsResponseDto } from '../dto/interests-mobile-dto';
import { InterestsRepository } from '../repositories/interests-repository';
import { AuditLogRecorder } from '../../audit-logs/services/audit-log-recorder';
import type { RequestContextDto } from '../../../shared/decorators/request-context-decorator';
import type { JwtPayload } from '../../../shared/types/jwt-payload';

@Injectable()
export class InterestsMobileService {
  constructor(
    private readonly interestsRepository: InterestsRepository,
    private readonly auditLogRecorder: AuditLogRecorder,
  ) {}

  async listInterests() {
    return this.interestsRepository.listActiveInterests();
  }

  async saveUserInterests(
    userId: string,
    selected: InterestCode[],
    /** `undefined` keeps the text already on file. */
    otherInterest: string | null | undefined,
    audit?: { actor: JwtPayload; context: RequestContextDto },
  ) {
    const user = await this.interestsRepository.findUserWithRole(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Any mobile account may hold interests — the app's role switcher is
    // local, so a beneficiary-registered user volunteering keeps their token
    // role. Directors and coordinators hold them for their Volunteer side;
    // other portal staff are excluded.
    if (!toMobileRole(user.role.type)) {
      throw new ForbiddenException('Only mobile accounts can save interests');
    }

    const activeCodes =
      await this.interestsRepository.findActiveInterestCodes(selected);
    if (activeCodes.length !== selected.length) {
      throw new BadRequestException(
        'One or more interest codes are invalid or inactive',
      );
    }

    // The typed text only describes the "Others" pick — drop it when OTHERS
    // is not selected so a stale value never outlives the choice. A save
    // that leaves the field out (code-only saves) keeps what was typed.
    let other: string | null = null;
    if (selected.includes(InterestCode.OTHERS)) {
      other =
        otherInterest === undefined
          ? ((await this.interestsRepository.findUserInterests(userId))
              ?.other_interest ?? null)
          : otherInterest?.trim() || null;
    }

    const saved = await this.interestsRepository.upsertUserInterests(
      userId,
      selected,
      other,
    );

    if (audit) {
      await this.auditLogRecorder.record({
        action: 'profile.interests.updated',
        description: `Interests updated: ${selected.join(', ') || 'none'}`,
        category: 'USER_MANAGEMENT',
        actor: audit.actor,
        targetType: 'user',
        targetLabel: audit.actor.email,
        targetId: userId,
        ipAddress: audit.context.ipAddress,
        userAgent: audit.context.userAgent,
        source: 'MOBILE',
        metadata: { count: `${selected.length}` },
      });
    }

    return {
      user_interest_id: saved.user_interest_id,
      user_id: saved.user_id,
      selected: saved.selected as InterestCode[],
      other_interest: saved.other_interest,
    };
  }

  async getUserInterests(userId: string): Promise<UserInterestsResponseDto> {
    const row = await this.interestsRepository.findUserInterests(userId);
    if (!row) {
      return { selected: null, other_interest: null };
    }

    return {
      selected: row.selected as InterestCode[],
      other_interest: row.other_interest,
    };
  }
}
