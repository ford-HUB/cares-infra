import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import {
  DecisionServiceClient,
  type NeedsHouseholdInput,
} from 'src/infastructures/microservices/decision-service-client';
import type {
  ClusterNeedsDto,
  ClusterNeedsResponseDto,
  HouseholdListResponseDto,
  HouseholdRowDto,
} from '../dto/residential-needs-site-dto';
import {
  ResidentialNeedsRepository,
  type NeedsAssessmentRow,
} from '../repositories/residential-needs-repository';
import { UNSPECIFIED_BARANGAY } from '../validators/residential-needs-site-validator';

/** Maps portal snake_case <-> decision-service camelCase. */
@Injectable()
export class ResidentialNeedsSiteService {
  private readonly logger = new Logger(ResidentialNeedsSiteService.name);

  constructor(
    private readonly decisionServiceClient: DecisionServiceClient,
    private readonly residentialNeedsRepository: ResidentialNeedsRepository,
  ) {}

  async listHouseholds(): Promise<HouseholdListResponseDto> {
    const rows = await this.residentialNeedsRepository.listSurveys();
    return { items: rows.map(toHouseholdRow) };
  }

  async clusterNeeds(data: ClusterNeedsDto): Promise<ClusterNeedsResponseDto> {
    const rows = await this.residentialNeedsRepository.listSurveys();
    const households = rows.map(toHouseholdRow).map(toServiceHousehold);

    try {
      const result = await this.decisionServiceClient.clusterNeeds(households, {
        k: data.k,
        seed: data.seed,
      });

      return {
        k: result.k,
        clusters: result.clusters.map((cluster) => ({
          index: cluster.index,
          household_ids: cluster.householdIds,
          centroid: cluster.centroid,
          dominant_need: cluster.dominantNeed,
          top_barrier: cluster.topBarrier,
          priority: cluster.priority,
          barangay: cluster.barangay,
          need_level: cluster.needLevel,
        })),
        assignments: result.assignments,
        inertia: result.inertia,
        iterations: result.iterations,
        converged: result.converged,
        seed: result.seed,
        algorithm: result.algorithm,
        features: result.features,
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(`Needs clustering failed: ${detail}`);
      throw new BadGatewayException(
        `Unable to cluster households right now. ${detail}`,
      );
    }
  }
}

function toHouseholdRow(row: NeedsAssessmentRow): HouseholdRowDto {
  const members =
    row.user.household_size ??
    row.user.assistance_requests[0]?.household_size ??
    1;
  return {
    id: row.needs_assessment_id,
    family_name: row.user.lastname,
    barangay: toBarangay(row.user),
    members: Math.max(1, members),
    survey: {
      needs: row.needs,
      other_need: row.other_need,
      seriousness: row.seriousness,
      barriers: row.barriers,
      other_barrier: row.other_barrier,
      community_problem: row.community_problem,
      other_community_problem: row.other_community_problem,
      concern: row.concern,
    },
    surveyed_at: row.submitted_at.toISOString(),
  };
}

/** Falls back to `current_address` (`Street, Barangay, City, Province`). */
function toBarangay(user: NeedsAssessmentRow['user']): string {
  const stored = user.address_barangay?.trim();
  if (stored) return stored;

  const parts = (user.current_address ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  // Not the app's format; don't guess.
  if (parts.length < 4) return UNSPECIFIED_BARANGAY;

  return parts[parts.length - 3] || UNSPECIFIED_BARANGAY;
}

function toServiceHousehold(household: HouseholdRowDto): NeedsHouseholdInput {
  const { survey } = household;
  return {
    id: household.id,
    familyName: household.family_name,
    barangay: household.barangay,
    members: household.members,
    survey: {
      needs: survey.needs,
      otherNeed: survey.other_need,
      seriousness: survey.seriousness,
      barriers: survey.barriers,
      otherBarrier: survey.other_barrier,
      communityProblem: survey.community_problem,
      otherCommunityProblem: survey.other_community_problem,
      concern: survey.concern,
    },
    surveyedAt: household.surveyed_at,
  };
}
