import { EventStatus } from '../../../infastructures/prisma/common/client';

export interface EventDto {
    event_id: number;
    title: string;
    description: string;
    event_started: string;
    event_ended: string;
    location: string;
    max_participants: number;
    participants: number;
    organizer_name: string;
    category: string;
    department?: string;
    specified_category?: string;
    event_image?: string;
    event_images: string[];
    status: EventStatus;
    funds_donation: boolean;
    goods_donation: boolean;
    goods_types: string[];
    beneficiary_applicable: boolean;
    max_beneficiaries?: number;
    geojson: unknown | null;
    area_sqm: number | null;
}

export interface PersistEventDto {
    title: string;
    description: string;
    event_started: Date;
    event_ended: Date;
    location: string;
    max_participants: number;
    organizer_name: string;
    category: string;
    department: string | null;
    specified_category: string | null;
    images: string[];
    status: EventStatus;
    funds_donation: boolean;
    goods_donation: boolean;
    goods_types: string[];
    beneficiary_applicable: boolean;
    max_beneficiaries: number | null;
    geojson: unknown | null;
    area_sqm: number | null;
}
