import { create } from 'zustand'
import toast from 'react-hot-toast'
import type { CaresEvent, CreateEventPayload, DonationOptionsPayload } from '../types/event'
import {
  cancelEvent,
  createEvent,
  deleteEvent,
  listEvents,
  updateEvent,
  updateEventDonations,
} from '../services/event-service'

interface EventState {
  events: CaresEvent[]
  loading: boolean
  /** False until the first fetch settles, so the mount render isn't read as "no events". */
  initialized: boolean
  error: string | null
  fetchEvents: () => Promise<void>
  addEvent: (payload: CreateEventPayload) => Promise<boolean>
  editEvent: (id: number, payload: CreateEventPayload) => Promise<boolean>
  removeEvent: (id: number) => Promise<boolean>
  cancelEvent: (id: number) => Promise<boolean>
  setDonationOptions: (id: number, options: DonationOptionsPayload) => Promise<boolean>
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  loading: false,
  initialized: false,
  error: null,

  fetchEvents: async () => {
    set({ loading: true, error: null })
    const res = await listEvents()
    if (res.success && res.data) {
      set({ events: res.data, loading: false, initialized: true })
    } else {
      set({ error: res.message ?? 'Failed to load events', loading: false, initialized: true })
    }
  },

  addEvent: async (payload) => {
    const res = await createEvent(payload)
    if (res.success) {
      toast.success('Event created successfully')
      await get().fetchEvents()
      return true
    }
    toast.error(res.message ?? 'Failed to create event')
    return false
  },

  editEvent: async (id, payload) => {
    const res = await updateEvent(id, payload)
    if (res.success) {
      toast.success('Event updated successfully')
      await get().fetchEvents()
      return true
    }
    toast.error(res.message ?? 'Failed to update event')
    return false
  },

  removeEvent: async (id) => {
    const res = await deleteEvent(id)
    if (res.success) {
      toast.success('Event deleted')
      await get().fetchEvents()
      return true
    }
    toast.error(res.message ?? 'Failed to delete event')
    return false
  },

  cancelEvent: async (id) => {
    const res = await cancelEvent(id)
    if (res.success) {
      toast.success('Event cancelled')
      await get().fetchEvents()
      return true
    }
    toast.error(res.message ?? 'Failed to cancel event')
    return false
  },

  setDonationOptions: async (id, options) => {
    const res = await updateEventDonations(id, options)
    if (res.success) {
      toast.success('Donation options updated')
      await get().fetchEvents()
      return true
    }
    toast.error(res.message ?? 'Failed to update donations')
    return false
  },
}))
