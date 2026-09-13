import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { InterestCode } from '../../../infastructures/prisma/common/client';
import {
  NlpEventMatch,
  NlpInterestScore,
  NlpServiceClient,
} from '../../../infastructures/microservices/nlp-service-client';
import { RedisService } from '../../../infastructures/redis/redis-service';
import { DurationUtils } from '../../../shared/utils/duration-utils';
import { InterestsRepository } from '../../interests/repositories/interests-repository';
import {
  RecommendedEventDto,
  RecommendedEventsResponseDto,
} from '../dto/events-mobile-dto';
import { EventsRepository } from '../repositories/events-repository';

type OpenEvent = Awaited<
  ReturnType<EventsRepository['findOpenForVolunteers']>
>[number];

type CatalogInterest = Awaited<
  ReturnType<InterestsRepository['listActiveInterests']>
>[number];

@Injectable()
export class EventsMobileService {
  private readonly logger = new Logger(EventsMobileService.name);

  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly interestsRepository: InterestsRepository,
    private readonly nlpServiceClient: NlpServiceClient,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Open events whose title and description read as one of the volunteer's
   * interests, best match first. The NLP tagging is per event and independent of
   * who is asking, so it is what gets cached — the intersection with the
   * volunteer's own interests is recomputed on every call.
   */
  async listRecommended(
    userId: string,
    limit: number,
  ): Promise<RecommendedEventsResponseDto> {
    const row = await this.interestsRepository.findUserInterests(userId);
    const selected = new Set((row?.selected as InterestCode[] | null) ?? []);
    if (selected.size === 0) {
      return { has_interests: false, events: [] };
    }

    const [catalog, events] = await Promise.all([
      this.interestsRepository.listActiveInterests(),
      this.eventsRepository.findOpenForVolunteers(),
    ]);
    if (events.length === 0) {
      return { has_interests: true, events: [] };
    }

    const labels = new Map(catalog.map((i) => [i.code, i.label]));
    const active = new Set(catalog.map((i) => i.code));
    const tags = await this.tagEvents(events, catalog);

    const recommended: RecommendedEventDto[] = [];
    for (const event of events) {
      const matched = this.withCategoryTag(
        event,
        tags.get(event.event_id),
        active,
      )
        .filter((tag) => selected.has(tag.code as InterestCode))
        .map((tag) => ({
          code: tag.code as InterestCode,
          label: labels.get(tag.code as InterestCode) ?? tag.code,
          score: tag.score,
        }));
      if (matched.length === 0) continue;

      recommended.push(this.mapToDto(event, matched));
    }

    recommended.sort(
      (a, b) =>
        b.match_score - a.match_score ||
        a.event_started.localeCompare(b.event_started),
    );

    return { has_interests: true, events: recommended.slice(0, limit) };
  }

  /**
   * Interest tags per event id. Keyed on a hash of the copy plus the catalog, so an
   * edited title or a changed interest list misses naturally instead of needing an
   * invalidation hook on the write path; stale keys age out on their TTL.
   */
  private async tagEvents(
    events: OpenEvent[],
    catalog: CatalogInterest[],
  ): Promise<Map<number, NlpInterestScore[]>> {
    const catalogHash = this.hash(
      catalog
        .map((i) => `${i.code}|${i.label}|${i.description ?? ''}`)
        .join('\n'),
    );
    // Read key by key: `getMany` compacts misses out of its result, and the miss
    // positions are exactly what is needed here.
    const cached = await Promise.all(
      events.map((event) =>
        this.redisService.get<NlpInterestScore[]>(
          this.tagsKey(event, catalogHash),
        ),
      ),
    );

    const tags = new Map<number, NlpInterestScore[]>();
    const misses: OpenEvent[] = [];
    events.forEach((event, index) => {
      const hit = cached[index];
      if (hit) {
        tags.set(event.event_id, hit);
      } else {
        misses.push(event);
      }
    });

    if (misses.length === 0) return tags;

    let matches: NlpEventMatch[];
    try {
      ({ matches } = await this.nlpServiceClient.matchEvents(
        misses.map((event) => ({
          id: event.event_id,
          title: event.title,
          description: event.description,
        })),
        catalog.map((interest) => ({
          code: interest.code,
          label: interest.label,
          description: interest.description,
        })),
      ));
    } catch (error) {
      this.logger.warn(
        `nlp-service match failed for ${misses.length} event(s): ${String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Event recommendations are temporarily unavailable',
      );
    }

    const missByEventId = new Map(misses.map((e) => [e.event_id, e]));
    await Promise.all(
      matches.map(async (match) => {
        const event = missByEventId.get(match.eventId);
        if (!event) return;
        tags.set(event.event_id, match.interests);
        await this.redisService.set(
          this.tagsKey(event, catalogHash),
          match.interests,
          DurationUtils.ONE_DAY,
        );
      }),
    );

    return tags;
  }

  /**
   * The organizer's own category pick is a stronger signal than anything read
   * out of the copy, so it always tags the event at full score; the NLP tags
   * only add interests the category does not already cover. "Others" falls
   * back to the specified category when that names a real interest.
   */
  private withCategoryTag(
    event: OpenEvent,
    nlpTags: NlpInterestScore[] | undefined,
    active: Set<string>,
  ): NlpInterestScore[] {
    const code = this.categoryCode(event, active);
    const rest = (nlpTags ?? []).filter((tag) => tag.code !== code);
    if (!code) return rest;
    return [{ code, score: 1, semantic: 1, lexical: 1 }, ...rest];
  }

  private categoryCode(event: OpenEvent, active: Set<string>): string | null {
    const candidates = [event.category, event.specified_category ?? ''];
    for (const raw of candidates) {
      const code = raw
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');
      if (code && code !== InterestCode.OTHERS && active.has(code)) return code;
    }
    return null;
  }

  private tagsKey(event: OpenEvent, catalogHash: string): string {
    const copyHash = this.hash(`${event.title}\n${event.description}`);
    return `cache:events:interest-tags:${event.event_id}:${copyHash}:${catalogHash}`;
  }

  private hash(value: string): string {
    return createHash('sha1').update(value).digest('hex').slice(0, 16);
  }

  private mapToDto(
    event: OpenEvent,
    matched: RecommendedEventDto['matched_interests'],
  ): RecommendedEventDto {
    return {
      event_id: event.event_id,
      title: event.title,
      description: event.description,
      event_started: event.event_started.toISOString(),
      event_ended: event.event_ended.toISOString(),
      location: event.location,
      max_participants: event.max_participants,
      participants: event.participants,
      organizer_name: event.organizer_name,
      category: event.category,
      status: event.status,
      beneficiary_applicable: event.beneficiary_applicable,
      marker_lat: event.marker_lat ?? null,
      marker_lng: event.marker_lng ?? null,
      image_count: event.images.length,
      matched_interests: matched,
      match_score: Math.max(...matched.map((m) => m.score)),
    };
  }
}
