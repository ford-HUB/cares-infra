import { Injectable } from '@nestjs/common';
import { ResidentialNeedsGateway } from '../../../gateways/residential-needs-gateway';
import type { NeedsAssessment } from '../../../infastructures/prisma/common/client';
import type {
  MobileNeedsAssessmentDto,
  MyNeedsAssessmentResponseDto,
  SubmitNeedsAssessmentDto,
} from '../dto/residential-needs-mobile-dto';
import { ResidentialNeedsRepository } from '../repositories/residential-needs-repository';

/**
 * The beneficiary's own Needs Assessment Survey. Free text is only kept when
 * the matching "other" choice is picked, so a stale entry from an earlier
 * answer never rides along.
 */
@Injectable()
export class ResidentialNeedsMobileService {
  constructor(
    private readonly residentialNeedsRepository: ResidentialNeedsRepository,
    private readonly residentialNeedsGateway: ResidentialNeedsGateway,
  ) {}

  async findMine(userId: string): Promise<MyNeedsAssessmentResponseDto> {
    const row = await this.residentialNeedsRepository.findByUser(userId);
    return { assessment: row ? toMobileDto(row) : null };
  }

  async submit(
    userId: string,
    body: SubmitNeedsAssessmentDto,
  ): Promise<MyNeedsAssessmentResponseDto> {
    const row = await this.residentialNeedsRepository.save(userId, {
      needs: [...new Set(body.needs)],
      otherNeed: body.needs.includes('other')
        ? textOrNull(body.other_need)
        : null,
      seriousness: body.seriousness,
      barriers: [...new Set(body.barriers)],
      otherBarrier: body.barriers.includes('other')
        ? textOrNull(body.other_barrier)
        : null,
      communityProblem: body.community_problem,
      otherCommunityProblem:
        body.community_problem === 'other'
          ? textOrNull(body.other_community_problem)
          : null,
      concern: textOrNull(body.concern),
    });
    // Open Residential Needs screens reload their list and clustering.
    this.residentialNeedsGateway.emitChanged();
    return { assessment: toMobileDto(row) };
  }
}

function textOrNull(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toMobileDto(row: NeedsAssessment): MobileNeedsAssessmentDto {
  return {
    needs: row.needs,
    other_need: row.other_need,
    seriousness: row.seriousness,
    barriers: row.barriers,
    other_barrier: row.other_barrier,
    community_problem: row.community_problem,
    other_community_problem: row.other_community_problem,
    concern: row.concern,
    submitted_at: row.submitted_at.toISOString(),
  };
}
