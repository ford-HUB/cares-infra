import { Injectable } from '@nestjs/common';

/** One household's Beneficiary Needs Assessment answers, as the portal shapes them. */
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
  /** Random start for k-means++; same seed over the same rows is reproducible. */
  seed?: number;
  maxIterations?: number;
}

export type NeedPriority = 'critical' | 'high' | 'moderate' | 'low';
/** The named Q1 categories the model flags — "other" is free text and left out. */
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
  /** `count` over the cluster's size — how concentrated the group is there. */
  share: number;
}

export interface NeedsCluster {
  /** 0-based, ordered highest need first. */
  index: number;
  householdIds: string[];
  /** Mean of every feature over the members, in original units. */
  centroid: Record<string, number>;
  dominantNeed: ClusterNeed;
  topBarrier: NeedBarrier;
  priority: NeedPriority;
  barangay: NeedsClusterBarangay;
  /** Seriousness (1–5) plus mean named needs ticked (0–5) — what the ranking uses. */
  needLevel: number;
}

export interface NeedsClusterResult {
  k: number;
  clusters: NeedsCluster[];
  assignments: Record<string, number>;
  /** Sum of squared distances to centroids in standardised feature space. */
  inertia: number;
  iterations: number;
  converged: boolean;
  seed: number;
  algorithm: string;
  features: string[];
}

/** decision-service already emits camelCase, so the envelope needs no renaming. */
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

  /**
   * Groups households with a similar need profile using scikit-learn K-Means and
   * describes each group — its defining need, top barrier, priority band, and the
   * barangay it concentrates in — so a programme can be aimed at each one.
   */
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
