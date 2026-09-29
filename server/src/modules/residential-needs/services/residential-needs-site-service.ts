import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import {
  DecisionServiceClient,
  type NeedsHouseholdInput,
} from 'src/infastructures/microservices/decision-service-client';
import type {
  ClusterNeedsDto,
  ClusterNeedsResponseDto,
  HouseholdDto,
} from '../dto/residential-needs-site-dto';

/**
 * The Residential Needs › Clusters screen. The portal sends the survey rows it is
 * showing and gets back the K-Means grouping from decision-service; the server
 * only translates between the portal's snake_case and the service's camelCase.
 * Once the survey lives in the database this is where the rows will be read
 * from instead of taken off the request.
 */
@Injectable()
export class ResidentialNeedsSiteService {
  private readonly logger = new Logger(ResidentialNeedsSiteService.name);

  constructor(private readonly decisionServiceClient: DecisionServiceClient) {}

  async clusterNeeds(data: ClusterNeedsDto): Promise<ClusterNeedsResponseDto> {
    const households = data.households.map(toServiceHousehold);

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

function toServiceHousehold(household: HouseholdDto): NeedsHouseholdInput {
  return {
    id: household.id,
    familyName: household.family_name,
    barangay: household.barangay,
    members: household.members,
    survey: {
      needs: household.survey.needs,
      otherNeed: household.survey.other_need ?? null,
      seriousness: household.survey.seriousness,
      barriers: household.survey.barriers,
      otherBarrier: household.survey.other_barrier ?? null,
      communityProblem: household.survey.community_problem,
      otherCommunityProblem: household.survey.other_community_problem ?? null,
      concern: household.survey.concern ?? null,
    },
    surveyedAt: household.surveyed_at ?? null,
  };
}
