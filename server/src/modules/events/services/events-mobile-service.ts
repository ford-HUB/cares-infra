import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  EventParticipationRole,
  EventRoleApproval,
  EventStatus,
  InterestCode,
  NotificationCategory,
  NotificationTone,
  Prisma,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import { NotificationScheduler } from '../../../schedulers/jobs/notification-scheduler';
import {
  NlpEventMatch,
  NlpInterestScore,
  NlpServiceClient,
} from '../../../infastructures/microservices/nlp-service-client';
import { RedisService } from '../../../infastructures/redis/redis-service';
import { DurationUtils } from '../../../shared/utils/duration-utils';
import {
  eventAudienceWhere,
  isEventVisibleTo,
} from '../../../shared/utils/event-audience';
import { geofenceRings } from '../../../shared/utils/geofence-utils';
import { DonationsRepository } from '../../donations/repositories/donations-repository';
import { InterestsRepository } from '../../interests/repositories/interests-repository';
import {
  DonationEventsResponseDto,
  EventParticipantsResponseDto,
  EventRegistrationResponseDto,
  RecommendedEventDto,
  RecommendedEventsResponseDto,
  RegisteredEventsResponseDto,
} from '../dto/events-mobile-dto';
import {
  EventsRepository,
  participationRoleLabel,
} from '../repositories/events-repository';

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
    private readonly donationsRepository: DonationsRepository,
    private readonly notificationScheduler: NotificationScheduler,
  ) {}

  /** Only the per-event NLP tagging is cached; the interest intersection is per call. */
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
      this.audienceFor(userId).then((audience) =>
        this.eventsRepository.findOpenForVolunteers(userId, audience),
      ),
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

  /** The beneficiary flag is the whole criterion; no interest matching. */
  async listForBeneficiaries(
    userId: string,
  ): Promise<RegisteredEventsResponseDto> {
    const events = await this.eventsRepository.findOpenForBeneficiaries(
      userId,
      await this.audienceFor(userId),
    );
    return { events: await this.withApplications(userId, events) };
  }

  /** Includes the amount raised for progress. */
  async listForDonors(userId: string): Promise<DonationEventsResponseDto> {
    const events = await this.eventsRepository.findOpenForDonors(
      userId,
      await this.audienceFor(userId),
    );
    const totals = await this.donationsRepository.totalsByEvent(
      events.map((event) => event.event_id),
    );
    return {
      events: events.map((event) =>
        this.mapToDto(event, [], totals.get(event.event_id)),
      ),
    };
  }

  async listCompletedForBeneficiaries(
    userId: string,
  ): Promise<RegisteredEventsResponseDto> {
    const events = await this.eventsRepository.findCompletedForBeneficiaries(
      userId,
      await this.audienceFor(userId),
    );
    return { events: await this.withApplications(userId, events) };
  }

  private async withApplications(
    userId: string,
    events: OpenEvent[],
  ): Promise<RecommendedEventDto[]> {
    const applications =
      await this.eventsRepository.findBeneficiaryApplications(
        userId,
        events.map((event) => event.event_id),
      );
    // Newest first, so a re-application after rejection shows PENDING.
    const latest = new Map<number, (typeof applications)[number]>();
    for (const application of applications) {
      if (application.event_id === null || latest.has(application.event_id)) {
        continue;
      }
      latest.set(application.event_id, application);
    }
    return events.map((event) => {
      const application = latest.get(event.event_id);
      return {
        ...this.mapToDto(event, []),
        application_status: application
          ? (application.status as 'PENDING' | 'ACCEPTED' | 'REJECTED')
          : null,
        application_rejection_reason:
          application?.status === 'REJECTED'
            ? application.rejection_reason
            : null,
      };
    });
  }

  /** Includes finished events, which drop out of the recommended pool. */
  async listRegistered(userId: string): Promise<RegisteredEventsResponseDto> {
    const events =
      await this.eventsRepository.findRegisteredForVolunteer(userId);
    return { events: events.map((event) => this.mapToDto(event, [])) };
  }

  /** Names and roles only; the caller's row is flagged instead of exposing ids. */
  async listParticipants(
    userId: string,
    eventId: number,
  ): Promise<EventParticipantsResponseDto> {
    const event = await this.eventsRepository.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');

    const rows = await this.eventsRepository.findParticipants(eventId);
    // Joined volunteers keep seeing the list after a department re-scope.
    const joined = rows.some((row) => row.user_id === userId);
    if (!joined && !(await this.canSee(userId, event))) {
      throw new NotFoundException('Event not found');
    }
    return {
      event_id: eventId,
      participants: rows.map((row) => ({
        name:
          `${row.user.firstname} ${row.user.lastname}`.trim() || 'Volunteer',
        is_me: row.user_id === userId,
        participation_role: row.participation_role,
        role_approval: row.role_approval,
        attendance_status: row.status,
      })),
    };
  }

  /** REGULAR is confirmed; other roles wait for approval. Idempotent. */
  async register(
    userId: string,
    eventId: number,
    role: EventParticipationRole = EventParticipationRole.REGULAR,
  ): Promise<EventRegistrationResponseDto> {
    const event = await this.assertOpen(eventId);
    if (!(await this.canSee(userId, event))) {
      throw new ForbiddenException(
        `This event is only open to ${event.department}`,
      );
    }

    const counts = await this.withSerializationRetry(() =>
      this.eventsRepository.register(eventId, userId, role),
    );
    if (!counts) {
      throw new ConflictException('This event has no slots left');
    }
    if (counts.created) {
      const pendingRole =
        counts.role_approval === EventRoleApproval.PENDING
          ? ` Your ${participationRoleLabel(counts.participation_role)} role is pending approval by the Director or Coordinator — until then you're registered as a regular volunteer.`
          : '';
      await this.notificationScheduler.publish({
        title: `You're registered for ${event.title}`,
        description: `See you ${formatEventStart(event.event_started)} at ${event.location}. We'll remind you before it starts — attendance is tracked by geofence once you arrive.${pendingRole}`,
        category: NotificationCategory.EVENT,
        tone: NotificationTone.INFO,
        href: `/events/${eventId}`,
        userIds: [userId],
        audienceRole: RoleType.VOLUNTEER,
        dedupeKey: `event-registered:${eventId}:${Date.now()}`,
      });
    }
    return this.toRegistrationDto(eventId, counts, {
      participation_role: counts.participation_role,
      role_approval: counts.role_approval,
    });
  }

  /** Not registered is not an error. */
  async unregister(
    userId: string,
    eventId: number,
  ): Promise<EventRegistrationResponseDto> {
    const event = await this.eventsRepository.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    // Locked once started; catches stale screens.
    if (
      event.status !== EventStatus.Upcoming ||
      event.event_started.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        'Registration can no longer be cancelled once the event has started',
      );
    }

    const counts = await this.withSerializationRetry(() =>
      this.eventsRepository.unregister(eventId, userId),
    );
    if (counts.removed) {
      await this.notificationScheduler.publish({
        title: `Registration cancelled for ${event.title}`,
        description:
          'Your slot was released. You can register again while the event is still open.',
        category: NotificationCategory.EVENT,
        tone: NotificationTone.INFO,
        href: `/events/${eventId}`,
        userIds: [userId],
        audienceRole: RoleType.VOLUNTEER,
        dedupeKey: `event-unregistered:${eventId}:${Date.now()}`,
      });
    }
    return this.toRegistrationDto(eventId, counts, null);
  }

  /** Hides School events scoped to another department. */
  private async audienceFor(userId: string) {
    return eventAudienceWhere(
      await this.eventsRepository.findUserDepartment(userId),
    );
  }

  private async canSee(
    userId: string,
    event: { category: string; department: string | null },
  ): Promise<boolean> {
    return isEventVisibleTo(
      event,
      await this.eventsRepository.findUserDepartment(userId),
    );
  }

  private async assertOpen(eventId: number) {
    const event = await this.eventsRepository.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    const open =
      (event.status === EventStatus.Upcoming ||
        event.status === EventStatus.Ongoing) &&
      event.event_ended.getTime() >= Date.now();
    if (!open) {
      throw new BadRequestException(
        'This event is no longer accepting registrations',
      );
    }
    return event;
  }

  /** Retries P2034 serialization aborts. */
  private async withSerializationRetry<T>(
    run: () => Promise<T>,
    attempts = 3,
  ): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await run();
      } catch (error) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < attempts;
        if (!retryable) throw error;
      }
    }
  }

  /** Null when the caller holds no slot. */
  private toRegistrationDto(
    eventId: number,
    counts: { participants: number; max_participants: number },
    registration: {
      participation_role: EventParticipationRole;
      role_approval: EventRoleApproval;
    } | null,
  ): EventRegistrationResponseDto {
    return {
      event_id: eventId,
      is_registered: registration !== null,
      participation_role: registration?.participation_role ?? null,
      role_approval: registration?.role_approval ?? null,
      max_participants: counts.max_participants,
      participants: counts.participants,
      slots_left: Math.max(0, counts.max_participants - counts.participants),
    };
  }

  /** Keyed on a hash of copy + catalog, so edits miss naturally; stale keys expire via TTL. */
  private async tagEvents(
    events: OpenEvent[],
    catalog: CatalogInterest[],
  ): Promise<Map<number, NlpInterestScore[]>> {
    const catalogHash = this.hash(
      catalog
        .map((i) => `${i.code}|${i.label}|${i.description ?? ''}`)
        .join('\n'),
    );
    // Key by key: `getMany` drops misses, and miss positions are needed.
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

  /** The organizer's category tags at full score; NLP only adds others. "Others" uses the specified category if it's a real interest. */
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
    donations: { fundsRaised: number; donations: number } = {
      fundsRaised: 0,
      donations: 0,
    },
  ): RecommendedEventDto {
    return {
      event_id: event.event_id,
      title: event.title,
      description: event.description,
      event_started: event.event_started.toISOString(),
      event_ended: event.event_ended.toISOString(),
      location: event.location,
      max_participants: event.max_participants,
      participants: event._count.attendances,
      slots_left: Math.max(
        0,
        event.max_participants - event._count.attendances,
      ),
      is_registered: event.attendances.length > 0,
      attendance_status: event.attendances[0]?.status ?? null,
      participation_role: event.attendances[0]?.participation_role ?? null,
      role_approval: event.attendances[0]?.role_approval ?? null,
      organizer_name: event.organizer_name,
      category: event.category,
      status: event.status,
      beneficiary_applicable: event.beneficiary_applicable,
      funds_donation: event.funds_donation,
      goods_donation: event.goods_donation,
      goods_types: event.goods_types,
      funds_raised: donations.fundsRaised,
      donations_count: donations.donations,
      application_status: null,
      application_rejection_reason: null,
      marker_lat: event.marker_lat ?? null,
      marker_lng: event.marker_lng ?? null,
      geofence: geofenceRings(event.geojson),
      image_count: event.images.length,
      matched_interests: matched,
      match_score:
        matched.length === 0 ? 0 : Math.max(...matched.map((m) => m.score)),
    };
  }
}

function formatEventStart(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: process.env.TZ || 'Asia/Manila',
  }).format(date);
}
