import { zodResolver } from '@hookform/resolvers/zod'
import type { Geometry } from 'geojson'
import { CalendarClock, ImagePlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  ALL_DEPARTMENTS,
  EVENT_CATEGORIES,
  EVENT_DEPARTMENTS,
  EVENT_IMAGE_MAX_BYTES,
  EVENT_IMAGE_MAX_COUNT,
  GOODS_TYPE_OPTIONS,
  summarizeEventDuration,
} from '../../../constants/event'
import { useEventStore } from '../../../store/event-store'
import type { CreateEventPayload, EventCategory } from '../../../types/event'
import { eventFormSchema, type EventFormValues } from '../../../validators/event-schema'
import { AddressAutocomplete } from '../ui/address-autocomplete'
import { BeneficiaryDonationPanel } from '../ui/beneficiary-donation-panel'
import { EventMapDraw } from '../map/event-map-draw'

interface EventFormModalProps {
  mode: 'create' | 'edit'
  eventId?: number
  defaultValues?: Partial<EventFormValues>
  onClose: () => void
  onSaved: () => void
}

function toDatetimeLocal(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EventFormModal({
  mode,
  eventId,
  defaultValues,
  onClose,
  onSaved,
}: EventFormModalProps) {
  const { addEvent, editEvent } = useEventStore()
  const [previews, setPreviews] = useState<string[]>([])
  const [selectedLocation, setSelectedLocation] = useState<{ lng: number; lat: number } | null>(
    null,
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema) as import('react-hook-form').Resolver<EventFormValues>,
    defaultValues: {
      title: defaultValues?.title ?? '',
      description: defaultValues?.description ?? '',
      event_started: toDatetimeLocal(defaultValues?.event_started as string | undefined),
      event_ended: toDatetimeLocal(defaultValues?.event_ended as string | undefined),
      location: defaultValues?.location ?? '',
      max_participants: defaultValues?.max_participants ?? 50,
      organizer_name: defaultValues?.organizer_name ?? '',
      category: (defaultValues?.category as EventCategory | undefined) ?? 'Community',
      department: defaultValues?.department ?? '',
      specified_category: defaultValues?.specified_category ?? '',
      beneficiary_applicable: defaultValues?.beneficiary_applicable ?? false,
      max_beneficiaries: defaultValues?.max_beneficiaries,
      funds_donation: defaultValues?.funds_donation ?? false,
      goods_donation: defaultValues?.goods_donation ?? false,
      goods_types: defaultValues?.goods_types ?? [],
      geojson: defaultValues?.geojson ?? null,
      area_sqm: defaultValues?.area_sqm ?? null,
      marker_lat: defaultValues?.marker_lat ?? null,
      marker_lng: defaultValues?.marker_lng ?? null,
      event_images: defaultValues?.event_images ?? [],
    },
  })

  const category = watch('category')
  const beneficiaryApplicable = watch('beneficiary_applicable')
  const geojson = watch('geojson') as Geometry | null | undefined
  const location = watch('location')
  const eventStarted = watch('event_started')
  const eventEnded = watch('event_ended')
  const durationSummary = summarizeEventDuration(eventStarted, eventEnded)
  const fundsDonation = watch('funds_donation')
  const goodsDonation = watch('goods_donation')
  const goodsTypes = watch('goods_types')

  useEffect(() => {
    if (!beneficiaryApplicable) {
      setValue('max_beneficiaries', undefined, { shouldValidate: false })
      setValue('funds_donation', false, { shouldValidate: false })
      setValue('goods_donation', false, { shouldValidate: false })
      setValue('goods_types', [], { shouldValidate: false })
    }
  }, [beneficiaryApplicable, setValue])

  const handleGoodsChange = (checked: boolean) => {
    setValue('goods_donation', checked, { shouldDirty: true })
    setValue(
      'goods_types',
      checked ? GOODS_TYPE_OPTIONS.map((g) => g.id) : [],
      { shouldDirty: true, shouldValidate: true },
    )
  }

  const toggleGoodsType = (id: string) => {
    const next = (goodsTypes ?? []).includes(id)
      ? (goodsTypes ?? []).filter((t) => t !== id)
      : [...(goodsTypes ?? []), id]
    setValue('goods_types', next, { shouldDirty: true, shouldValidate: true })
  }

  const eventImages = watch('event_images')

  useEffect(() => {
    const urls = (eventImages ?? []).map((img) =>
      img instanceof File ? URL.createObjectURL(img) : img,
    )
    setPreviews(urls)
    return () => {
      urls.forEach((u) => {
        if (u.startsWith('blob:')) URL.revokeObjectURL(u)
      })
    }
  }, [eventImages])

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    const current = eventImages ?? []
    const room = EVENT_IMAGE_MAX_COUNT - current.length
    if (room <= 0) {
      toast.error(`You can upload up to ${EVENT_IMAGE_MAX_COUNT} images`)
      return
    }

    const accepted = files.filter((file) => {
      if (file.size > EVENT_IMAGE_MAX_BYTES) {
        toast.error(`"${file.name}" exceeds 3MB and was skipped`)
        return false
      }
      return true
    })
    if (accepted.length > room) {
      toast.error(`Only ${EVENT_IMAGE_MAX_COUNT} images allowed; extra images were skipped`)
    }

    const toAdd = accepted.slice(0, room)
    if (toAdd.length === 0) return
    setValue('event_images', [...current, ...toAdd], {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const removeImageAt = (index: number) => {
    const current = eventImages ?? []
    setValue(
      'event_images',
      current.filter((_, i) => i !== index),
      { shouldDirty: true, shouldValidate: true },
    )
  }

  const onSubmit = async (data: EventFormValues) => {
    const payload: CreateEventPayload = {
      title: data.title,
      description: data.description,
      event_started: new Date(data.event_started).toISOString(),
      event_ended: new Date(data.event_ended).toISOString(),
      location: data.location,
      max_participants: data.max_participants,
      organizer_name: data.organizer_name,
      category: data.category as EventCategory,
      department: data.department,
      specified_category: data.specified_category,
      event_images: data.event_images,
      beneficiary_applicable: data.beneficiary_applicable,
      max_beneficiaries: data.beneficiary_applicable ? data.max_beneficiaries : undefined,
      funds_donation: data.beneficiary_applicable ? data.funds_donation : false,
      goods_donation: data.beneficiary_applicable ? data.goods_donation : false,
      goods_types:
        data.beneficiary_applicable && data.goods_donation ? data.goods_types : [],
      geojson: (data.geojson as Geometry | null) ?? null,
      area_sqm: data.area_sqm ?? null,
      marker_lat: data.marker_lat ?? null,
      marker_lng: data.marker_lng ?? null,
    }

    const ok =
      mode === 'create'
        ? await addEvent(payload)
        : eventId
          ? await editEvent(eventId, payload)
          : false

    if (ok) {
      onSaved()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col items-stretch justify-center gap-4 lg:flex-row lg:items-start">
        <div className="flex max-h-[90vh] w-full flex-col rounded-xl bg-white p-6 shadow-lg lg:max-w-2xl">
          <div className="mb-4 flex items-center justify-between pb-4">
          <h2 className="text-xl font-semibold">
            {mode === 'create' ? 'Create New Event' : 'Update Event'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="scrollbar-hide flex-1 space-y-4 overflow-y-auto px-1 py-2"
        >
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Event Images</label>
              <span className="text-xs text-gray-400">
                {previews.length}/{EVENT_IMAGE_MAX_COUNT} · max 3MB each
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {previews.map((url, index) => (
                <div
                  key={url}
                  className="relative h-28 overflow-hidden rounded-lg border border-gray-200"
                >
                  <img src={url} alt={`Event ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImageAt(index)}
                    className="absolute top-1.5 right-1.5 rounded-full bg-white p-1 shadow hover:bg-gray-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {previews.length < EVENT_IMAGE_MAX_COUNT && (
                <label
                  htmlFor="event-images"
                  className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100"
                >
                  <ImagePlus size={20} />
                  <span className="text-xs">Add image</span>
                  <input
                    id="event-images"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImagesChange}
                  />
                </label>
              )}
            </div>
            {errors.event_images && (
              <p className="mt-1 text-xs text-red-500">
                {errors.event_images.message as string}
              </p>
            )}
          </div>

          <Field label="Event Title" error={errors.title?.message}>
            <input
              className={inputClass(!!errors.title)}
              placeholder="Enter event title"
              {...register('title')}
            />
          </Field>

          <Field label="Description" error={errors.description?.message}>
            <textarea
              rows={3}
              className={inputClass(!!errors.description)}
              placeholder="Describe the event"
              {...register('description')}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Start" error={errors.event_started?.message}>
              <input
                type="datetime-local"
                className={inputClass(!!errors.event_started)}
                {...register('event_started')}
              />
            </Field>
            <Field label="End" error={errors.event_ended?.message}>
              <input
                type="datetime-local"
                className={inputClass(!!errors.event_ended)}
                {...register('event_ended')}
              />
            </Field>
          </div>

          {durationSummary && (
            <div className="rounded-lg border border-green-100 bg-green-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-green-800">
                <CalendarClock size={16} />
                Event summary
              </div>
              <dl className="space-y-1 text-sm text-green-900">
                <div className="flex justify-between gap-3">
                  <dt className="text-green-700">Starts</dt>
                  <dd className="text-right font-medium">{durationSummary.startLabel}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-green-700">Ends</dt>
                  <dd className="text-right font-medium">{durationSummary.endLabel}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-green-700">Duration</dt>
                  <dd className="text-right font-medium">
                    {durationSummary.friendlyLabel}
                    {durationSummary.spansMultipleDays && (
                      <span className="ml-1 text-green-700">
                        ({durationSummary.totalHoursLabel} total)
                      </span>
                    )}
                  </dd>
                </div>
                {!durationSummary.spansMultipleDays && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-green-700">Total hours</dt>
                    <dd className="text-right font-medium">{durationSummary.totalHoursLabel}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          <Field label="Venue / Location" error={errors.location?.message}>
            <AddressAutocomplete
              id="event-location"
              value={location ?? ''}
              error={!!errors.location}
              placeholder="Start typing the event address…"
              onChange={(text) =>
                setValue('location', text, { shouldDirty: true, shouldValidate: true })
              }
              onSelect={(suggestion) => {
                setValue('location', suggestion.label, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
                setSelectedLocation({ lng: suggestion.lng, lat: suggestion.lat })
              }}
            />
          </Field>

          <EventMapDraw
            value={geojson ?? null}
            focus={selectedLocation}
            marker={
              defaultValues?.marker_lat != null && defaultValues?.marker_lng != null
                ? { lat: defaultValues.marker_lat, lng: defaultValues.marker_lng }
                : null
            }
            onChange={(geometry, areaSqM) => {
              setValue('geojson', geometry, { shouldDirty: true })
              setValue('area_sqm', areaSqM, { shouldDirty: true })
            }}
            onMarkerChange={(center) => {
              setValue('marker_lat', center.lat, { shouldDirty: true })
              setValue('marker_lng', center.lng, { shouldDirty: true })
            }}
            onAddressResolved={(label, center) => {
              setValue('location', label, { shouldDirty: true, shouldValidate: true })
              setSelectedLocation(center)
            }}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Max participants" error={errors.max_participants?.message}>
              <input
                type="number"
                min={1}
                className={inputClass(!!errors.max_participants)}
                {...register('max_participants')}
              />
            </Field>
            <Field label="Organizer" error={errors.organizer_name?.message}>
              <input
                className={inputClass(!!errors.organizer_name)}
                {...register('organizer_name')}
              />
            </Field>
          </div>

          <Field label="Category" error={errors.category?.message}>
            <select className={inputClass(!!errors.category)} {...register('category')}>
              <option value="">Select category</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          {category === 'School' && (
            <Field label="Department" error={errors.department?.message}>
              <select className={inputClass(!!errors.department)} {...register('department')}>
                <option value="">Select department</option>
                <option value={ALL_DEPARTMENTS}>All Departments</option>
                {EVENT_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {category === 'Others' && (
            <Field label="Specify category" error={errors.specified_category?.message}>
              <input
                className={inputClass(!!errors.specified_category)}
                {...register('specified_category')}
              />
            </Field>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register('beneficiary_applicable')} />
            Beneficiary applicable
          </label>

          {beneficiaryApplicable && (
            <Field label="Max beneficiaries (optional)" error={errors.max_beneficiaries?.message}>
              <input
                type="number"
                min={1}
                className={inputClass(!!errors.max_beneficiaries)}
                {...register('max_beneficiaries')}
              />
            </Field>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (mode === 'edit' && !isDirty)}
              className="rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-white hover:bg-[var(--cares-primary-hover)] disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create Event' : 'Update Event'}
            </button>
          </div>
        </form>
        </div>

        {beneficiaryApplicable && (
          <BeneficiaryDonationPanel
            funds={fundsDonation ?? false}
            goods={goodsDonation ?? false}
            goodsTypes={goodsTypes ?? []}
            goodsError={errors.goods_types?.message}
            onFundsChange={(value) =>
              setValue('funds_donation', value, { shouldDirty: true })
            }
            onGoodsChange={handleGoodsChange}
            onToggleGoodsType={toggleGoodsType}
          />
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return `w-full rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-[var(--cares-primary)] ${
    hasError ? 'border-red-500' : 'border-gray-300'
  }`
}
