import { z } from 'zod'
import type { EventCategory } from '../types/event'
import {
  EVENT_CATEGORIES,
  EVENT_IMAGE_MAX_BYTES,
  EVENT_IMAGE_MAX_COUNT,
} from '../constants/event'

const categoryEnum = z.enum(
  EVENT_CATEGORIES as [EventCategory, ...EventCategory[]],
)

export const eventFormSchema = z
  .object({
    title: z
      .string()
      .min(3, 'Event title must be at least 3 characters')
      .max(255, 'Event title must not exceed 255 characters')
      .trim(),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(2000, 'Description must not exceed 2000 characters')
      .trim(),
    event_started: z.string().min(1, 'Start date and time is required'),
    event_ended: z.string().min(1, 'End date and time is required'),
    location: z
      .string()
      .min(3, 'Location must be at least 3 characters')
      .max(255, 'Location must not exceed 255 characters')
      .trim(),
    max_participants: z
      .union([z.string(), z.number()])
      .transform((v) => (typeof v === 'string' ? Number(v) : v))
      .pipe(z.number().int().min(1).max(10000)),
    organizer_name: z
      .string()
      .min(2, 'Organizer name must be at least 2 characters')
      .max(255)
      .trim(),
    category: categoryEnum,
    department: z.string().optional(),
    specified_category: z.string().optional(),
    event_images: z
      .array(z.union([z.instanceof(File), z.string()]))
      .max(EVENT_IMAGE_MAX_COUNT, `You can upload up to ${EVENT_IMAGE_MAX_COUNT} images`)
      .refine(
        (files) =>
          files.every((f) => !(f instanceof File) || f.size <= EVENT_IMAGE_MAX_BYTES),
        { message: 'Each image must be 3MB or smaller' },
      )
      .default([]),
    beneficiary_applicable: z.boolean().default(false),
    max_beneficiaries: z.coerce.number().optional(),
    funds_donation: z.boolean().default(false),
    goods_donation: z.boolean().default(false),
    goods_types: z.array(z.string()).default([]),
    geojson: z.unknown().optional().nullable(),
    area_sqm: z.number().optional().nullable(),
    marker_lat: z.number().optional().nullable(),
    marker_lng: z.number().optional().nullable(),
  })
  .refine(
    (data) => {
      if (!data.event_started || !data.event_ended) return true
      return new Date(data.event_ended) > new Date(data.event_started)
    },
    { message: 'End must be after start', path: ['event_ended'] },
  )
  .refine(
    (data) =>
      data.category !== 'School' ||
      Boolean(data.department && data.department.trim().length > 0),
    { message: 'Department is required for School events', path: ['department'] },
  )
  .refine(
    (data) =>
      data.category !== 'Others' ||
      Boolean(data.specified_category && data.specified_category.trim().length >= 2),
    { message: 'Please specify a category name', path: ['specified_category'] },
  )
  .refine(
    (data) => {
      // Optional, but if provided it must be a positive number.
      if (data.max_beneficiaries === undefined || Number.isNaN(data.max_beneficiaries)) {
        return true
      }
      return data.max_beneficiaries > 0
    },
    {
      message: 'Max beneficiaries must be a positive number',
      path: ['max_beneficiaries'],
    },
  )
  .refine(
    (data) => {
      if (!data.beneficiary_applicable || !data.goods_donation) return true
      return data.goods_types.length > 0
    },
    {
      message: 'Select at least one accepted goods type',
      path: ['goods_types'],
    },
  )

export type EventFormValues = z.infer<typeof eventFormSchema>
