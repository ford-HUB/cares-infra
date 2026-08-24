import { deriveEventStatus } from '../constants/event-filters'
import type {
  CaresEvent,
  CreateEventPayload,
  DonationOptionsPayload,
} from '../types/event'
import { apiClient, parseApiError } from './api-client'

/** Backend wraps successful responses in an { ok, data } envelope. */
type ApiEnvelope<T> = { ok: true; message?: string; data: T }

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
  if (payload.marker_lat != null && payload.marker_lng != null) {
    formData.append('marker_lat', String(payload.marker_lat))
    formData.append('marker_lng', String(payload.marker_lng))
  }
  return formData
}

export async function listEvents() {
  try {
    const { data: body } = await apiClient.get<ApiEnvelope<CaresEvent[]>>('/api/v1/events')
    return { success: true as const, data: body.data.map(withLiveStatus) }
  } catch (error) {
    return { success: false as const, message: parseApiError(error), data: [] as CaresEvent[] }
  }
}

export async function createEvent(payload: CreateEventPayload) {
  try {
    const formData = buildFormData(payload)
    const { data: body } = await apiClient.post<ApiEnvelope<CaresEvent>>('/api/v1/events', formData)
    return { success: true as const, data: body.data }
  } catch (error) {
    return { success: false as const, message: parseApiError(error), data: null }
  }
}

export async function updateEvent(id: number, payload: CreateEventPayload) {
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
  try {
    await apiClient.delete(`/api/v1/events/${id}`)
    return { success: true as const, data: true }
  } catch (error) {
    return { success: false as const, message: parseApiError(error), data: false }
  }
}

export async function cancelEvent(id: number) {
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
