import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  RANKING_TIER_MAX_COUNT,
  RANKING_TIER_MIN_COUNT,
  RANKING_TIER_NEW_LABEL,
  RANKING_TIER_RANK_STEP,
} from '../constants/ranking'
import { RANK_FRAME_DEFAULT_COLORS, nextUnusedFrame } from '../constants/rank-frames'
import { useRankingStore } from '../store/ranking-store'
import {
  rankingCustomizationDefaultValues,
  rankingCustomizationSchema,
  type RankingCustomizationFormValues,
} from '../validators/ranking-customization-schema'

export function useRankingCustomizationForm() {
  const settings = useRankingStore((state) => state.settings)
  const initialized = useRankingStore((state) => state.initialized)
  const saving = useRankingStore((state) => state.saving)
  const fetchRankings = useRankingStore((state) => state.fetchRankings)
  const saveSettings = useRankingStore((state) => state.saveSettings)

  const form = useForm<RankingCustomizationFormValues>({
    resolver: zodResolver(rankingCustomizationSchema),
    defaultValues: rankingCustomizationDefaultValues,
  })

  const tiers = useFieldArray({ control: form.control, name: 'tiers' })

  useEffect(() => {
    void fetchRankings()
  }, [fetchRankings])

  /**
   * Reset rather than set, so the saved settings become the form's baseline — that is
   * what makes `isDirty` mean "differs from what is stored".
   */
  useEffect(() => {
    if (!initialized) return

    form.reset(settings)
  }, [initialized, settings, form])

  const onSubmit = form.handleSubmit(async (values) => {
    const ok = await saveSettings(values)

    if (!ok) {
      toast.error('The ranking settings could not be saved.')
      return
    }

    toast.success('Ranking settings saved. Both boards were rescored.')
    form.reset(values)
  })

  /**
   * The ladder's rungs are its cut-offs, and they have to stay ascending with the
   * catch-all last. Every edit below rebuilds the whole array and hands it to
   * `replace`, so the invariant is restored in one step rather than patched per row.
   */
  const replaceTiers = (next: RankingCustomizationFormValues['tiers']) => {
    const withCatchAll = next.map((tier, index) => ({
      ...tier,
      maxRank:
        index === next.length - 1 ? Number.POSITIVE_INFINITY : tier.maxRank,
    }))

    tiers.replace(withCatchAll)
  }

  const onAddTier = () => {
    const current = form.getValues('tiers')

    if (current.length >= RANKING_TIER_MAX_COUNT) {
      toast.error(`A ladder can hold at most ${RANKING_TIER_MAX_COUNT} tiers.`)
      return
    }

    // New tiers land just above the catch-all: the top of the ladder is the one
    // place a cut-off cannot be guessed, so it is never taken over.
    const catchAllIndex = current.length - 1
    const above = current[catchAllIndex - 1]

    replaceTiers([
      ...current.slice(0, catchAllIndex),
      {
        id: `tier-${Date.now().toString(36)}`,
        label: RANKING_TIER_NEW_LABEL,
        maxRank: (above?.maxRank ?? 0) + RANKING_TIER_RANK_STEP,
        frame: nextUnusedFrame(current.map((tier) => tier.frame)),
        ...RANK_FRAME_DEFAULT_COLORS,
      },
      current[catchAllIndex],
    ])
  }

  const onRemoveTier = (index: number) => {
    const current = form.getValues('tiers')

    if (current.length <= RANKING_TIER_MIN_COUNT) {
      toast.error(`A ladder needs at least ${RANKING_TIER_MIN_COUNT} tiers.`)
      return
    }

    replaceTiers(current.filter((_, position) => position !== index))
  }

  /**
   * Moving a tier swaps it with its neighbour but leaves the cut-offs where they
   * are — the rungs stay put and the tier climbs one. Carrying the number along
   * instead would break the ascending order the ladder is validated on.
   */
  const onMoveTier = (index: number, direction: -1 | 1) => {
    const current = form.getValues('tiers')
    const target = index + direction

    if (target < 0 || target >= current.length) return

    const next = [...current]
    next[index] = current[target]
    next[target] = current[index]

    replaceTiers(
      next.map((tier, position) => ({ ...tier, maxRank: current[position].maxRank })),
    )
  }

  const onReset = () => {
    form.reset(rankingCustomizationDefaultValues)
    toast('Shipped defaults restored — save to apply them.')
  }

  return {
    form,
    tierFields: tiers.fields,
    onSubmit,
    onReset,
    onAddTier,
    onRemoveTier,
    onMoveTier,
    saving,
    loading: !initialized,
  }
}
