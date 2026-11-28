import { Injectable } from '@nestjs/common';

export interface NeedsHouseholdInput {
  id: string;
  familyName: string;
  barangay: string;
  members: number;
  survey: {
    needs: string[];
    otherNeed?: string | null;
    seriousness: number;
    barriers: string[];
    otherBarrier?: string | null;
    communityProblem: string;
    otherCommunityProblem?: string | null;
    concern?: string | null;
  };
  surveyedAt?: string | null;
}

export interface NeedsClusterOptions {
  /** Groups to find; the service clamps it to the row count. */
  k?: number;
  /** k-means++ seed; reproducible for the same rows. */
  seed?: number;
  maxIterations?: number;
}

export type NeedPriority = 'critical' | 'high' | 'moderate' | 'low';
/** Named Q1 categories; free-text "other" excluded. */
export type ClusterNeed =
  | 'food'
  | 'healthcare'
  | 'education'
  | 'livelihood'
  | 'financial';
export type NeedBarrier =
  | 'money'
  | 'services'
  | 'distance'
  | 'information'
  | 'documents'
  | 'opportunities'
  | 'other'
  | 'none';

export interface NeedsClusterBarangay {
  name: string;
  count: number;
  /** `count` / cluster size. */
  share: number;
}

export interface NeedsCluster {
  /** 0-based, ordered highest need first. */
  index: number;
  householdIds: string[];
  /** Member feature means, original units. */
  centroid: Record<string, number>;
  dominantNeed: ClusterNeed;
  topBarrier: NeedBarrier;
  priority: NeedPriority;
  barangay: NeedsClusterBarangay;
  /** Seriousness (1–5) + mean named needs (0–5); the ranking key. */
  needLevel: number;
}

export interface NeedsClusterResult {
  k: number;
  clusters: NeedsCluster[];
  assignments: Record<string, number>;
  /** Sum of squared distances in standardised space. */
  inertia: number;
  iterations: number;
  converged: boolean;
  seed: number;
  algorithm: string;
  features: string[];
}

/** Already camelCase. */
interface DecisionApiResponse {
  ok: boolean;
  message?: string;
  data?: NeedsClusterResult;
  errors?: unknown;
}

@Injectable()
export class DecisionServiceClient {
  private readonly baseUrl =
    process.env.DECISION_SERVICE_URL ?? 'http://localhost:8006';

  async clusterNeeds(
    households: NeedsHouseholdInput[],
    options: NeedsClusterOptions = {},
  ): Promise<NeedsClusterResult> {
    const response = await fetch(`${this.baseUrl}/api/v1/cluster-needs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ households, ...options }),
    });

    const payload = (await response.json()) as DecisionApiResponse;
    if (!response.ok || !payload.ok || !payload.data) {
      throw new Error(payload.message ?? 'Decision service failed');
    }
    return payload.data;
  }
}
