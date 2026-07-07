import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventStatus } from '../../infastructures/prisma/common/client';
import { resolveImageMimeType } from '../../common/utils/image-mime';
import { S3Service } from '../../infastructures/s3/s3-service';
import { EventDto, PersistEventDto } from './events-dto';
import { EventsRepository } from './events-repository';
import {
    CreateEventInput,
    EVENT_ALLOWED_IMAGE_MIMES,
    EVENT_MAX_IMAGE_BYTES,
    EVENT_MAX_IMAGE_COUNT,
    UpdateDonationsInput,
    UpdateEventInput,
} from './events-validator';

type StoredEvent = NonNullable<Awaited<ReturnType<EventsRepository['findById']>>>;

@Injectable()
export class EventsService {
    constructor(
        private readonly eventsRepository: EventsRepository,
        private readonly s3Service: S3Service,
    ) {}

    async listEvents(): Promise<EventDto[]> {
        const events = await this.eventsRepository.findAll();
        return events.map((event) => this.mapToDto(event));
    }

    async createEvent(
        data: CreateEventInput,
        files?: Express.Multer.File[],
    ): Promise<EventDto> {
        const uploaded = await this.uploadImages(files);
        const images = [...data.event_images_existing, ...uploaded].slice(0, EVENT_MAX_IMAGE_COUNT);

        const created = await this.eventsRepository.create(this.toPersistDto(data, images));
        return this.mapToDto(created);
    }

    async updateEvent(
        id: number,
        data: UpdateEventInput,
        files?: Express.Multer.File[],
    ): Promise<EventDto> {
        const existing = await this.eventsRepository.findById(id);
        if (!existing) {
            throw new NotFoundException('Event not found');
        }

        const uploaded = await this.uploadImages(files);
        const images = [...data.event_images_existing, ...uploaded].slice(0, EVENT_MAX_IMAGE_COUNT);

        const updated = await this.eventsRepository.update(id, this.toPersistDto(data, images));
        return this.mapToDto(updated);
    }

    async updateDonations(id: number, options: UpdateDonationsInput): Promise<EventDto> {
        const existing = await this.eventsRepository.findById(id);
        if (!existing) {
            throw new NotFoundException('Event not found');
        }

        const updated = await this.eventsRepository.updateDonations(id, {
            funds_donation: options.funds,
            goods_donation: options.goods,
            goods_types: options.goods ? options.goodsTypes : [],
        });
        return this.mapToDto(updated);
    }

    async cancelEvent(id: number): Promise<EventDto> {
        const existing = await this.eventsRepository.findById(id);
        if (!existing) {
            throw new NotFoundException('Event not found');
        }
        if (existing.status === EventStatus.Cancelled) {
            throw new BadRequestException('Event is already cancelled');
        }

        const updated = await this.eventsRepository.updateStatus(id, EventStatus.Cancelled);
        return this.mapToDto(updated);
    }

    async deleteEvent(id: number): Promise<void> {
        const existing = await this.eventsRepository.findById(id);
        if (!existing) {
            throw new NotFoundException('Event not found');
        }
        await this.eventsRepository.delete(id);
    }

    private toPersistDto(data: CreateEventInput, images: string[]): PersistEventDto {
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
            max_beneficiaries: data.beneficiary_applicable ? data.max_beneficiaries ?? null : null,
            geojson: data.geojson,
            area_sqm: data.area_sqm ?? null,
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
                throw new BadRequestException('Each event image must be 3 MB or smaller');
            }

            const mime = resolveImageMimeType(file.mimetype, file.originalname);
            if (!(EVENT_ALLOWED_IMAGE_MIMES as readonly string[]).includes(mime)) {
                throw new BadRequestException('Only JPG, PNG, or WebP images are allowed');
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
            geojson: (event.geojson as unknown) ?? null,
            area_sqm: event.area_sqm ?? null,
        };
    }
}
