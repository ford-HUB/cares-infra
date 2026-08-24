import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus } from '../../../infastructures/prisma/common/client';
import { resolveImageMimeType } from '../../../shared/utils/image-mime';
import { S3Service } from '../../../infastructures/s3/s3-service';
import type { RequestContextDto } from '../../../shared/decorators/request-context-decorator';
import type { JwtPayload } from '../../../shared/types/jwt-payload';
import type { AuditLogChangeDto } from '../../audit-logs/dto/audit-logs-site-dto';
import { AuditLogRecorder } from '../../audit-logs/services/audit-log-recorder';
import {
  CreateEventDto,
  EventDto,
  PersistEventDto,
  UpdateDonationsDto,
  UpdateEventDto,
} from '../dto/events-site-dto';
import { EventsRepository } from '../repositories/events-repository';
import {
  EVENT_ALLOWED_IMAGE_MIMES,
  EVENT_MAX_IMAGE_BYTES,
  EVENT_MAX_IMAGE_COUNT,
} from '../validators/events-site-validator';

type StoredEvent = NonNullable<
  Awaited<ReturnType<EventsRepository['findById']>>
>;

@Injectable()
export class EventsSiteService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly s3Service: S3Service,
    private readonly auditLogRecorder: AuditLogRecorder,
  ) {}

  async listEvents(): Promise<EventDto[]> {
    const events = await this.eventsRepository.findAll();
    return events.map((event) => this.mapToDto(event));
  }

  async createEvent(
    caller: JwtPayload,
    data: CreateEventDto,
    files?: Express.Multer.File[],
    context: RequestContextDto = {},
  ): Promise<EventDto> {
    const uploaded = await this.uploadImages(files);
    const images = [...data.event_images_existing, ...uploaded].slice(
      0,
      EVENT_MAX_IMAGE_COUNT,
    );

    const created = await this.eventsRepository.create(
      this.toPersistDto(data, images),
    );

    await this.auditLogRecorder.record({
      action: 'event.created',
      description: `Created the event "${created.title}"`,
      category: 'EVENT',
      actor: caller,
      targetType: 'event',
      targetLabel: created.title,
      targetId: String(created.event_id),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        starts_at: created.event_started.toISOString(),
        location: created.location,
      },
    });

    return this.mapToDto(created);
  }

  async updateEvent(
    caller: JwtPayload,
    id: number,
    data: UpdateEventDto,
    files?: Express.Multer.File[],
    context: RequestContextDto = {},
  ): Promise<EventDto> {
    const existing = await this.eventsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Event not found');
    }

    const uploaded = await this.uploadImages(files);
    const images = [...data.event_images_existing, ...uploaded].slice(
      0,
      EVENT_MAX_IMAGE_COUNT,
    );

    const persisted = this.toPersistDto(data, images);
    const changes = diffEvent(existing, persisted);
    const updated = await this.eventsRepository.update(id, persisted);

    await this.auditLogRecorder.record({
      action: 'event.updated',
      description: changes.length
        ? `Updated the event "${updated.title}" (${changes.length} field${changes.length === 1 ? '' : 's'})`
        : `Saved the event "${updated.title}" with no changes`,
      category: 'EVENT',
      actor: caller,
      targetType: 'event',
      targetLabel: updated.title,
      targetId: String(updated.event_id),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      changes,
    });

    return this.mapToDto(updated);
  }

  async updateDonations(
    caller: JwtPayload,
    id: number,
    options: UpdateDonationsDto,
    context: RequestContextDto = {},
  ): Promise<EventDto> {
    const existing = await this.eventsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Event not found');
    }

    const updated = await this.eventsRepository.updateDonations(id, {
      funds_donation: options.funds,
      goods_donation: options.goods,
      goods_types: options.goods ? options.goodsTypes : [],
    });

    await this.auditLogRecorder.record({
      action: 'event.donations.updated',
      description: `Updated the donation options for "${updated.title}"`,
      category: 'EVENT',
      actor: caller,
      targetType: 'event',
      targetLabel: updated.title,
      targetId: String(updated.event_id),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      changes: [
        {
          field: 'funds_donation',
          before: String(existing.funds_donation),
          after: String(updated.funds_donation),
        },
        {
          field: 'goods_donation',
          before: String(existing.goods_donation),
          after: String(updated.goods_donation),
        },
        {
          field: 'goods_types',
          before: existing.goods_types.join(', ') || 'none',
          after: updated.goods_types.join(', ') || 'none',
        },
      ].filter((change) => change.before !== change.after),
    });

    return this.mapToDto(updated);
  }

  async cancelEvent(
    caller: JwtPayload,
    id: number,
    context: RequestContextDto = {},
  ): Promise<EventDto> {
    const existing = await this.eventsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Event not found');
    }
    if (existing.status === EventStatus.Cancelled) {
      throw new BadRequestException('Event is already cancelled');
    }

    const updated = await this.eventsRepository.updateStatus(
      id,
      EventStatus.Cancelled,
    );

    await this.auditLogRecorder.record({
      action: 'event.cancelled',
      description: `Cancelled the event "${updated.title}"`,
      category: 'EVENT',
      // Volunteers already signed up lose the event, so a cancellation is not the
      // same ordinary edit an update is.
      severity: 'NOTICE',
      actor: caller,
      targetType: 'event',
      targetLabel: updated.title,
      targetId: String(updated.event_id),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      changes: [
        {
          field: 'status',
          before: existing.status,
          after: updated.status,
        },
      ],
      metadata: { participants: String(updated.participants) },
    });

    return this.mapToDto(updated);
  }

  async deleteEvent(
    caller: JwtPayload,
    id: number,
    context: RequestContextDto = {},
  ): Promise<void> {
    const existing = await this.eventsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Event not found');
    }

    await this.eventsRepository.delete(id);

    await this.auditLogRecorder.record({
      action: 'event.deleted',
      description: `Deleted the event "${existing.title}"`,
      category: 'EVENT',
      // The row is gone from the events table, so this entry is the only remaining
      // record that it existed at all.
      severity: 'WARNING',
      actor: caller,
      targetType: 'event',
      targetLabel: existing.title,
      targetId: String(existing.event_id),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        starts_at: existing.event_started.toISOString(),
        participants: String(existing.participants),
      },
    });
  }

  private toPersistDto(
    data: CreateEventDto,
    images: string[],
  ): PersistEventDto {
    const start = new Date(data.event_started);
    const end = new Date(data.event_ended);

    return {
      title: data.title,
      description: data.description,
      event_started: start,
      event_ended: end,
      location: data.location,
      max_participants: data.max_participants,
      organizer_name: data.organizer_name,
      category: data.category,
      department: data.department?.trim() ? data.department.trim() : null,
      specified_category: data.specified_category?.trim()
        ? data.specified_category.trim()
        : null,
      images,
      status: this.deriveStatus(start, end),
      funds_donation: data.funds_donation,
      goods_donation: data.goods_donation,
      goods_types: data.goods_donation ? data.goods_types : [],
      beneficiary_applicable: data.beneficiary_applicable,
      max_beneficiaries: data.beneficiary_applicable
        ? (data.max_beneficiaries ?? null)
        : null,
      geojson: data.geojson,
      area_sqm: data.area_sqm ?? null,
      marker_lat: data.marker_lat ?? null,
      marker_lng: data.marker_lng ?? null,
    };
  }

  private deriveStatus(start: Date, end: Date): EventStatus {
    const now = Date.now();
    if (now < start.getTime()) return EventStatus.Upcoming;
    if (now > end.getTime()) return EventStatus.Completed;
    return EventStatus.Ongoing;
  }

  private async uploadImages(files?: Express.Multer.File[]): Promise<string[]> {
    if (!files?.length) return [];

    const urls: string[] = [];
    for (const file of files) {
      if (!file.buffer?.length) {
        throw new BadRequestException('One of the event images is empty');
      }
      if (file.size > EVENT_MAX_IMAGE_BYTES) {
        throw new BadRequestException(
          'Each event image must be 3 MB or smaller',
        );
      }

      const mime = resolveImageMimeType(file.mimetype, file.originalname);
      if (!(EVENT_ALLOWED_IMAGE_MIMES as readonly string[]).includes(mime)) {
        throw new BadRequestException(
          'Only JPG, PNG, or WebP images are allowed',
        );
      }

      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const key = `events/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
      urls.push(await this.s3Service.uploadToS3(key, file.buffer, mime));
    }

    return urls;
  }

  private mapToDto(event: StoredEvent): EventDto {
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
      department: event.department ?? undefined,
      specified_category: event.specified_category ?? undefined,
      event_image: event.images[0],
      event_images: event.images,
      status: event.status,
      funds_donation: event.funds_donation,
      goods_donation: event.goods_donation,
      goods_types: event.goods_types,
      beneficiary_applicable: event.beneficiary_applicable,
      max_beneficiaries: event.max_beneficiaries ?? undefined,
      geojson: event.geojson ?? null,
      area_sqm: event.area_sqm ?? null,
      marker_lat: event.marker_lat ?? null,
      marker_lng: event.marker_lng ?? null,
    };
  }
}

/**
 * Field-level before/after pairs for the audit trail. Only the fields an operator
 * edits are compared: images and geometry change on almost every save and would bury
 * the fields a review actually reads.
 */
function diffEvent(
  previous: StoredEvent,
  next: PersistEventDto,
): AuditLogChangeDto[] {
  // Read explicitly rather than by indexing a key list: the two shapes are a Prisma
  // row and a DTO, and indexing them by a shared key widens every value to a union
  // wide enough to lose the compiler's help here.
  const pairs: [string, EventFieldValue, EventFieldValue][] = [
    ['title', previous.title, next.title],
    ['description', previous.description, next.description],
    ['location', previous.location, next.location],
    ['max_participants', previous.max_participants, next.max_participants],
    ['organizer_name', previous.organizer_name, next.organizer_name],
    ['category', previous.category, next.category],
    ['department', previous.department, next.department],
    [
      'specified_category',
      previous.specified_category,
      next.specified_category,
    ],
    ['status', previous.status, next.status],
    ['event_started', previous.event_started, next.event_started],
    ['event_ended', previous.event_ended, next.event_ended],
    [
      'beneficiary_applicable',
      previous.beneficiary_applicable,
      next.beneficiary_applicable,
    ],
    ['max_beneficiaries', previous.max_beneficiaries, next.max_beneficiaries],
  ];

  return pairs.flatMap(([field, previousValue, nextValue]) => {
    const before = formatEventValue(previousValue);
    const after = formatEventValue(nextValue);

    return before === after ? [] : [{ field, before, after }];
  });
}

/** Every compared field is a scalar or a date; the trail stores them as text. */
type EventFieldValue = string | number | boolean | Date | null;

function formatEventValue(value: EventFieldValue | undefined): string {
  if (value === null || value === undefined) return 'none';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
