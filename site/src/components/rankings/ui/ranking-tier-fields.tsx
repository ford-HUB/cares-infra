import { ChevronDown, ChevronUp, Palette, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import {
  RANKING_TIER_MAX_COUNT,
  RANKING_TIER_MIN_COUNT,
} from '../../../constants/ranking'
import { RANK_FRAME_DESIGNS } from '../../../constants/rank-frames'
import type { RankFrameAppearance } from '../../../types/ranking'
import type { RankingCustomizationFormValues } from '../../../validators/ranking-customization-schema'
import { RankBadgeModal } from './rank-badge-modal'
import { RankFrame } from './rank-frame'

interface RankingTierFieldsProps {
  form: UseFormReturn<RankingCustomizationFormValues>
  fields: { id: string }[]
  inputClass: string
  onAddTier: () => void
  onRemoveTier: (index: number) => void
  /** -1 moves the tier up the ladder, 1 moves it down. */
  onMoveTier: (index: number, direction: -1 | 1) => void
}

const iconButtonClass =
  'flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40'

/**
 * One row per tier, highest first. The row stays a single line — design and colours
 * are edited in a modal, so opening the gallery never reflows the ladder behind it.
 */
export function RankingTierFields({
  form,
  fields,
  inputClass,
  onAddTier,
  onRemoveTier,
  onMoveTier,
}: RankingTierFieldsProps) {
  const tiers = form.watch('tiers')
  const tierError = form.formState.errors.tiers
  const [editing, setEditing] = useState<number | null>(null)

  const apply = (index: number, patch: Partial<RankFrameAppearance>) => {
    Object.entries(patch).forEach(([key, value]) => {
      form.setValue(
        `tiers.${index}.${key as keyof RankFrameAppearance}`,
        value as never,
        { shouldDirty: true },
      )
    })
  }

  const editingTier = editing === null ? null : tiers[editing]

  return (
    <div className="space-y-2">
      {fields.map((field, index) => {
        const tier = tiers[index]
        if (!tier) return null

        // The last tier has no ceiling — it catches everyone the others didn't.
        const isCatchAll = index === fields.length - 1
        const labelError = tierError?.[index]?.label
        const colorError = tierError?.[index]?.colorFrom ?? tierError?.[index]?.colorTo
        const design = RANK_FRAME_DESIGNS.find((option) => option.id === tier.frame)

        return (
          <div
            key={field.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 p-3"
          >
            <RankFrame
              appearance={tier}
              size="md"
              title={`${tier.label} badge preview`}
            />

            <label className="min-w-40 flex-1">
              <span className="sr-only">Tier name</span>
              <input
                type="text"
                {...form.register(`tiers.${index}.label`)}
                className={`${inputClass} w-full`}
              />
            </label>

            {isCatchAll ? (
              <span className="w-44 text-[12px] text-gray-500">
                Everyone below {tiers[index - 1]?.maxRank ?? 0}
              </span>
            ) : (
              <label className="flex w-44 items-center gap-2 text-[12px] text-gray-500">
                Up to rank
                <input
                  type="number"
                  min={1}
                  {...form.register(`tiers.${index}.maxRank`, { valueAsNumber: true })}
                  className={`${inputClass} w-20`}
                />
              </label>
            )}

            <button
              type="button"
              onClick={() => setEditing(index)}
              className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-[12px] font-medium text-gray-700 hover:bg-gray-50"
            >
              <Palette className="h-3.5 w-3.5" />
              {design?.label ?? 'Badge'}
            </button>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onMoveTier(index, -1)}
                disabled={index === 0}
                aria-label={`Move ${tier.label} up`}
                className={iconButtonClass}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMoveTier(index, 1)}
                disabled={index === fields.length - 1}
                aria-label={`Move ${tier.label} down`}
                className={iconButtonClass}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onRemoveTier(index)}
                disabled={fields.length <= RANKING_TIER_MIN_COUNT}
                aria-label={`Remove ${tier.label}`}
                title={
                  fields.length <= RANKING_TIER_MIN_COUNT
                    ? `A ladder needs at least ${RANKING_TIER_MIN_COUNT} tiers`
                    : `Remove ${tier.label}`
                }
                className={`${iconButtonClass} hover:text-red-600`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {(labelError || colorError) && (
              <p className="w-full text-[12px] text-red-600">
                {labelError?.message ?? colorError?.message}
              </p>
            )}
          </div>
        )
      })}

      {tierError?.root && (
        <p className="text-[12px] text-red-600">{tierError.root.message}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={onAddTier}
          disabled={fields.length >= RANKING_TIER_MAX_COUNT}
          className="flex h-9 items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-3 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add tier
        </button>
        <p className="text-[12px] text-gray-500">
          {fields.length} of {RANKING_TIER_MAX_COUNT} tiers — a new one is cut just
          above the catch-all, then renamed and moved from there.
        </p>
      </div>

      {editing !== null && editingTier && (
        <RankBadgeModal
          tierLabel={editingTier.label}
          appearance={editingTier}
          inputClass={inputClass}
          onChange={(patch) => apply(editing, patch)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
