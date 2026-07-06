import type { Geometry } from 'geojson'
import { deriveEventStatus } from '../constants/event-filters'
import { MOCK_EVENTS } from '../constants/mock-events'
import type {
  CaresEvent,
  CreateEventPayload,
  DonationOptionsPayload,
} from '../types/event'
import { apiClient, USE_MOCK_API, parseApiError } from './api-client'

/** Events follow the global mock flag (VITE_USE_MOCK_API). */
const USE_EVENT_MOCK = USE_MOCK_API

/** Backend wraps successful responses in an { ok, data } envelope. */
type ApiEnvelope<T> = { ok: true; message?: string; data: T }

let mockEvents: CaresEvent[] = [...MOCK_EVENTS]
let nextEventId = Math.max(...MOCK_EVENTS.map((e) => e.event_id)) + 1

/** Resolve payload image entries (File or existing URL) to displayable URLs for mock data. */
function resolveImageUrls(images?: (File | string)[]): string[] {
  return (images ?? []).map((img) =>
    img instanceof File ? URL.createObjectURL(img) : img,
  )
}

function withLiveStatus(event: CaresEvent): CaresEvent {
  return {
    ...event,
    status: deriveEventStatus(event.event_started, event.event_ended, event.status),
  }
}

function buildFormData(payload: CreateEventPayload): FormData {
  const formData = new FormData()
  formData.append('title', payload.title)
  formData.append('description', payload.description)
  formData.append('event_started', payload.event_started)
  formData.append('event_ended', payload.event_ended)
  formData.append('location', payload.location)
  formData.append('max_participants', String(payload.max_participants))
  formData.append('organizer_name', payload.organizer_name)
  formData.append('category', payload.category)
  formData.append('beneficiary_applicable', String(payload.beneficiary_applicable))

  if (payload.department) formData.append('department', payload.department)
  if (payload.specified_category) {
    formData.append('specified_category', payload.specified_category)
  }
  if (payload.beneficiary_applicable && payload.max_beneficiaries) {
    formData.append('max_beneficiaries', String(payload.max_beneficiaries))
  }
  formData.append('funds_donation', String(payload.funds_donation ?? false))
  formData.append('goods_donation', String(payload.goods_donation ?? false))
  if (payload.goods_donation && payload.goods_types?.length) {
    payload.goods_types.forEach((t) => formData.append('goods_types', t))
  }
  if (payload.event_images?.length) {
    payload.event_images.forEach((img) => {
      if (img instanceof File) {
        formData.append('event_images', img)
      } else {
        formData.append('event_images_existing', img)
      }
    })
  }
  if (payload.geojson) {
    formData.append('geojson', JSON.stringify(payload.geojson))
  }
  if (payload.area_sqm != null) {
    formData.append('area_sqm', String(payload.area_sqm))
  }
  return formData
}

export async function listEvents() {
  if (USE_EVENT_MOCK) {
    mockEvents = mockEvents.map(withLiveStatus)
    return { success: true as const, data: [...mockEvents] }
  }
  try {
    const { data: body } = await apiClient.get<ApiEnvelope<CaresEvent[]>>('/api/v1/events')
    return { success: true as const, data: body.data.map(withLiveStatus) }
  } catch (error) {
    return { success: false as const, message: parseApiError(error), data: [] as CaresEvent[] }
  }
}

export async function createEvent(payload: CreateEventPayload) {
  if (USE_EVENT_MOCK) {
    const imageUrls = resolveImageUrls(payload.event_images)
    const event: CaresEvent = {
      event_id: nextEventId++,
      title: payload.title,
      description: payload.description,
      event_started: new Date(payload.event_started).toISOString(),
      event_ended: new Date(payload.event_ended).toISOString(),
      location: payload.location,
      max_participants: payload.max_participants,
      participants: 0,
      organizer_name: payload.organizer_name,
      category: payload.category,
      department: payload.department,
      specified_category: payload.specified_category,
      event_image: imageUrls[0],
      event_images: imageUrls,
      status: deriveEventStatus(payload.event_started, payload.event_ended),
      funds_donation: payload.funds_donation ?? false,
      goods_donation: payload.goods_donation ?? false,
      goods_types: payload.goods_donation ? (payload.goods_types ?? []) : [],
      beneficiary_applicable: payload.beneficiary_applicable,
      max_beneficiaries: payload.max_beneficiaries,
      geojson: (payload.geojson as Geometry | null) ?? null,
      area_sqm: payload.area_sqm ?? null,
    }
    mockEvents = [event, ...mockEvents]
    return { success: true as const, data: event }
  }
  try {
    const formData = buildFormData(payload)
    const { data: body } = await apiClient.post<ApiEnvelope<CaresEvent>>('/api/v1/events', formData)
    return { success: true as const, data: body.data }
  } catch (error) {
    return { success: false as const, message: parseApiError(error), data: null }
  }
}

export async function updateEvent(id: number, payload: CreateEventPayload) {
  if (USE_EVENT_MOCK) {
    const index = mockEvents.findIndex((e) => e.event_id === id)
    if (index === -1) {
      return { success: false as const, message: 'Event not found', data: null }
    }
    const existing = mockEvents[index]
    const updated: CaresEvent = {
      ...existing,
      title: payload.title,
      description: payload.description,
      event_started: new Date(payload.event_started).toISOString(),
      event_ended: new Date(payload.event_ended).toISOString(),
      location: payload.location,
      max_participants: payload.max_participants,
      organizer_name: payload.organizer_name,
      category: payload.category,
      department: payload.department,
      specified_category: payload.specified_category,
      beneficiary_applicable: payload.beneficiary_applicable,
      max_beneficiaries: payload.max_beneficiaries,
      funds_donation: payload.funds_donation ?? existing.funds_donation,
      goods_donation: payload.goods_donation ?? existing.goods_donation,
      goods_types: payload.goods_donation
        ? (payload.goods_types ?? existing.goods_types)
        : [],
      geojson: (payload.geojson as Geometry | null) ?? existing.geojson ?? null,
      area_sqm: payload.area_sqm ?? existing.area_sqm ?? null,
      status: deriveEventStatus(payload.event_started, payload.event_ended),
      ...(payload.event_images
        ? (() => {
            const imageUrls = resolveImageUrls(payload.event_images)
            return { event_image: imageUrls[0], event_images: imageUrls }
          })()
        : {}),
    }
    mockEvents = [...mockEvents.slice(0, index), updated, ...mockEvents.slice(index + 1)]
    return { success: true as const, data: updated }
  }
  try {
    const formData = buildFormData(payload)
    const { data: body } = await apiClient.put<ApiEnvelope<CaresEvent>>(
      `/api/v1/events/${id}`,
      formData,
    )
    return { success: true as const, data: body.data }
  } catch (error) {
    return { success: false as const, message: parseApiError(error), data: null }
  }
}

export async function deleteEvent(id: number) {
  if (USE_EVENT_MOCK) {
    mockEvents = mockEvents.filter((e) => e.event_id !== id)
    return { success: true as const, data: true }
  }
  try {
    await apiClient.delete(`/api/v1/events/${id}`)
    return { success: true as const, data: true }
  } catch (error) {
    return { success: false as const, message: parseApiError(error), data: false }
  }
}

export async function cancelEvent(id: number) {
  if (USE_EVENT_MOCK) {
    const index = mockEvents.findIndex((e) => e.event_id === id)
    if (index === -1) {
      return { success: false as const, message: 'Event not found', data: null }
    }
    const updated: CaresEvent = { ...mockEvents[index], status: 'Cancelled' }
    mockEvents = [...mockEvents.slice(0, index), updated, ...mockEvents.slice(index + 1)]
    return { success: true as const, data: updated }
  }
  try {
    const { data: body } = await apiClient.patch<ApiEnvelope<CaresEvent>>(
      `/api/v1/events/${id}/cancel`,
    )
    return { success: true as const, data: body.data }
  } catch (error) {
    return { success: false as const, message: parseApiError(error), data: null }
  }
}

export async function updateEventDonations(id: number, options: DonationOptionsPayload) {
  if (USE_EVENT_MOCK) {
    const index = mockEvents.findIndex((e) => e.event_id === id)
    if (index === -1) {
      return { success: false as const, message: 'Event not found', data: null }
    }
    const updated: CaresEvent = {
      ...mockEvents[index],
      funds_donation: options.funds,
      goods_donation: options.goods,
      goods_types: options.goods ? options.goodsTypes : [],
    }
    mockEvents = [...mockEvents.slice(0, index), updated, ...mockEvents.slice(index + 1)]
    return { success: true as const, data: updated }
  }
  try {
    const { data: body } = await apiClient.patch<ApiEnvelope<CaresEvent>>(
      `/api/v1/events/${id}/donations`,
      options,
    )
    return { success: true as const, data: body.data }
  } catch (error) {
    return { success: false as const, message: parseApiError(error), data: null }
  }
}
