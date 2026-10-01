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

/**
 * The Residential Needs screens. Every row is a Needs Assessment Survey a
 * beneficiary submitted from the app; the Clusters screen hands the same rows
 * to decision-service for the K-Means grouping. The server translates between
 * the portal's snake_case and the service's camelCase.
 */
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

/**
 * The respondent's profile supplies the household details the survey does not
 * ask: family name, barangay, and head count (profile first, else the size
 * given on their latest assistance request).
 */
function toHouseholdRow(row: NeedsAssessmentRow): HouseholdRowDto {
  const members =
    row.user.household_size ??
    row.user.assistance_requests[0]?.household_size ??
    1;
  return {
    id: row.needs_assessment_id,
    family_name: row.user.lastname,
    barangay: row.user.address_barangay?.trim() || UNSPECIFIED_BARANGAY,
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
