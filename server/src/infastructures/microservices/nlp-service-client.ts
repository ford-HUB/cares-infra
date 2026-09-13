import { Injectable } from '@nestjs/common';

export interface NlpMatchEventInput {
  id: number;
  title: string;
  description: string;
}

export interface NlpMatchInterestInput {
  code: string;
  label: string;
  description: string | null;
}

export interface NlpInterestScore {
  code: string;
  score: number;
  semantic: number;
  lexical: number;
}

export interface NlpEventMatch {
  eventId: number;
  interests: NlpInterestScore[];
}

export interface NlpMatchResult {
  model: string;
  threshold: number;
  matches: NlpEventMatch[];
}

/** nlp-service emits snake_case; the public types above are the camelCase view. */
interface NlpApiResponse {
  ok: boolean;
  message?: string;
  data?: {
    model: string;
    threshold: number;
    matches: {
      event_id: number;
      interests: NlpInterestScore[];
    }[];
  };
  errors?: unknown;
}

@Injectable()
export class NlpServiceClient {
  private readonly baseUrl =
    process.env.NLP_SERVICE_URL ?? 'http://localhost:8004';

  /**
   * Tags each event with the interest codes its title and description read as.
   * The catalog is passed in rather than baked into the service so the database
   * stays the single source of truth for which interests exist.
   */
  async matchEvents(
    events: NlpMatchEventInput[],
    interests: NlpMatchInterestInput[],
    options: { threshold?: number; topK?: number } = {},
  ): Promise<NlpMatchResult> {
    const response = await fetch(`${this.baseUrl}/api/v1/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events,
        interests,
        threshold: options.threshold,
        top_k: options.topK,
      }),
    });

    const payload = (await response.json()) as NlpApiResponse;
    if (!response.ok || !payload.ok || !payload.data) {
      throw new Error(payload.message ?? 'NLP service failed');
    }

    return {
      model: payload.data.model,
      threshold: payload.data.threshold,
      matches: payload.data.matches.map((match) => ({
        eventId: match.event_id,
        interests: match.interests,
      })),
    };
  }
}
