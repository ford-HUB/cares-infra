import type { Geometry } from 'geojson'

export type EventStatus = 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled'

export type EventCategory =
  | 'School'
  | 'Community'
  | 'Emergency'
  | 'Donation Drive'
  | 'Charity'
  | 'Relief Program'
  | 'Health'
  | 'Outreach'
  | 'Training'
  | 'Seminar'
  | 'Others'

export interface CaresEvent {
  event_id: number
  title: string
  description: string
  event_started: string
  event_ended: string
  location: string
  max_participants: number
  participants: number
  organizer_name: string
  category: EventCategory
  department?: string
  specified_category?: string
  event_image?: string
  event_images?: string[]
  status: EventStatus
  funds_donation: boolean
  goods_donation: boolean
  goods_types: string[]
  beneficiary_applicable: boolean
  max_beneficiaries?: number
  geojson?: Geometry | null
  area_sqm?: number | null
}

export interface EventTableRow {
  id: number
  event_id: number
  title: string
  type: string
  date: string
  dateFull: string
  startTime: string
  endTime: string
  timeRange: string
  location: string
  maxParticipants: number
  currentParticipants: number
  description: string
  event_image?: string
  organizer: string
  department?: string
  funds: boolean
  goods: boolean
  status: EventStatus
  beneficiary_applicable: boolean
  max_beneficiaries?: number
  rawEvent: CaresEvent
}

export interface DonationOptionsPayload {
  funds: boolean
  goods: boolean
  goodsTypes: string[]
}

export interface CreateEventPayload {
  title: string
  description: string
  event_started: string
  event_ended: string
  location: string
  max_participants: number
  organizer_name: string
  category: EventCategory
  department?: string
  specified_category?: string
  event_image?: File | string | null
  event_images?: (File | string)[]
  beneficiary_applicable: boolean
  max_beneficiaries?: number
  funds_donation?: boolean
  goods_donation?: boolean
  goods_types?: string[]
  geojson?: Geometry | null
  area_sqm?: number | null
}
