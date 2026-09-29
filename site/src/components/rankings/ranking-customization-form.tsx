import { Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DONOR_PESOS_PER_POINT_MAX,
  DONOR_PESOS_PER_POINT_MIN,
  GOODS_TYPE_VALUE_MAX,
  GOODS_TYPE_VALUE_MIN,
  RANKING_BOARDS,
  RANKING_PERIODS,
  VOLUNTEER_ABSENCE_PENALTY_STEP_MAX,
  VOLUNTEER_ABSENCE_PENALTY_STEP_MIN,
  VOLUNTEER_ABSENCE_RESET_DAYS_MAX,
  VOLUNTEER_ABSENCE_RESET_DAYS_MIN,
  VOLUNTEER_POINTS_PER_ATTENDANCE_MAX,
  VOLUNTEER_POINTS_PER_ATTENDANCE_MIN,
} from '../../constants/ranking'
import { GOODS_TYPE_OPTIONS } from '../../constants/event'
import { formatCurrency, formatNumber } from '../../constants/formatting'
import type { useRankingCustomizationForm } from '../../hooks/use-ranking-customization-form'
import { RankingTierFields } from './ui/ranking-tier-fields'

type RankingCustomizationFormProps = ReturnType<typeof useRankingCustomizationForm>

const inputClass =
  'h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

const cardClass = 'rounded-xl border border-gray-200 bg-white p-5 shadow-sm'

/** Example figures, so a rate change reads as points before it is saved. */
const SAMPLE_EVENTS = 5
const SAMPLE_STREAK = 3
const SAMPLE_AMOUNT = 5000

export function RankingCustomizationForm({
  form,
  tierFields,
  onSubmit,
  onReset,
  onAddTier,
  onRemoveTier,
  onMoveTier,
  saving,
  isDirty,
  loading,
}: RankingCustomizationFormProps) {
  const { errors } = form.formState
  const pointsPerAttendance = form.watch('pointsPerAttendance')
  const penaltyStep = form.watch('absencePenaltyStep')
  const resetDays = form.watch('absenceResetDays')
  const pesosPerPoint = form.watch('donorPesosPerPoint')

  // The escalation spelled out: −2, −4, −6 for three straight misses.
  const streakExample = Array.from(
    { length: SAMPLE_STREAK },
    (_, index) => `−${(penaltyStep || 0) * (index + 1)}`,
  ).join(', ')

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton aria-hidden className="h-40 w-full rounded-xl" />
        <Skeleton aria-hidden className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <section className={cardClass}>
        <h2 className="text-[15px] font-semibold text-gray-900">Scoring Criteria</h2>
        <p className="mt-1 text-[12px] text-gray-500">
          The two boards are scored apart: volunteers on attendance, donors on amount
          given. Every event attended earns points; a registered event skipped costs a
          penalty that grows with each straight miss and resets after the window.
          Saving rescores both boards.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[13px] font-medium text-gray-700">
              Points per attendance
            </span>
            <input
              type="number"
              min={VOLUNTEER_POINTS_PER_ATTENDANCE_MIN}
              max={VOLUNTEER_POINTS_PER_ATTENDANCE_MAX}
              {...form.register('pointsPerAttendance', { valueAsNumber: true })}
              className={`${inputClass} mt-1.5 w-full`}
            />
            <span className="mt-1 block text-[12px] text-gray-500">
              {SAMPLE_EVENTS} events attended ={' '}
              {formatNumber(SAMPLE_EVENTS * (pointsPerAttendance || 0))} pts
            </span>
            {errors.pointsPerAttendance && (
              <span className="mt-1 block text-[12px] text-red-600">
                {errors.pointsPerAttendance.message}
              </span>
            )}
          </label>

          <label className="block">
            <span className="text-[13px] font-medium text-gray-700">
              Penalty per missed registration
            </span>
            <input
              type="number"
              min={VOLUNTEER_ABSENCE_PENALTY_STEP_MIN}
              max={VOLUNTEER_ABSENCE_PENALTY_STEP_MAX}
              {...form.register('absencePenaltyStep', { valueAsNumber: true })}
              className={`${inputClass} mt-1.5 w-full`}
            />
            <span className="mt-1 block text-[12px] text-gray-500">
              {SAMPLE_STREAK} straight misses = {streakExample} pts
            </span>
            {errors.absencePenaltyStep && (
              <span className="mt-1 block text-[12px] text-red-600">
                {errors.absencePenaltyStep.message}
              </span>
            )}
          </label>

          <label className="block">
            <span className="text-[13px] font-medium text-gray-700">
              Streak window (days)
            </span>
            <input
              type="number"
              min={VOLUNTEER_ABSENCE_RESET_DAYS_MIN}
              max={VOLUNTEER_ABSENCE_RESET_DAYS_MAX}
              {...form.register('absenceResetDays', { valueAsNumber: true })}
              className={`${inputClass} mt-1.5 w-full`}
            />
            <span className="mt-1 block text-[12px] text-gray-500">
              A miss more than {resetDays || 0} days after the last one, or after an
              attended event, starts the penalty over.
            </span>
            {errors.absenceResetDays && (
              <span className="mt-1 block text-[12px] text-red-600">
                {errors.absenceResetDays.message}
              </span>
            )}
          </label>

          <label className="block">
            <span className="text-[13px] font-medium text-gray-700">
              Pesos per point
            </span>
            <input
              type="number"
              min={DONOR_PESOS_PER_POINT_MIN}
              max={DONOR_PESOS_PER_POINT_MAX}
              {...form.register('donorPesosPerPoint', { valueAsNumber: true })}
              className={`${inputClass} mt-1.5 w-full`}
            />
            <span className="mt-1 block text-[12px] text-gray-500">
              {formatCurrency(SAMPLE_AMOUNT)} ={' '}
              {formatNumber(Math.floor(SAMPLE_AMOUNT / (pesosPerPoint || 1)))} pts
            </span>
            {errors.donorPesosPerPoint && (
              <span className="mt-1 block text-[12px] text-red-600">
                {errors.donorPesosPerPoint.message}
              </span>
            )}
          </label>
        </div>

        <h3 className="mt-5 text-[13px] font-semibold text-gray-900">Goods values</h3>
        <p className="mt-1 text-[12px] text-gray-500">
          Pesos credited per unit of each goods type when a goods donation is
          confirmed — that value, not a cash figure, is what earns the donor points.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {GOODS_TYPE_OPTIONS.map((type) => {
            const Icon = type.icon
            const fieldError = errors.goodsTypeValues?.[type.id]
            return (
              <label key={type.id} className="block">
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700">
                  <Icon className={`h-3.5 w-3.5 ${type.color}`} aria-hidden />
                  {type.name}
                </span>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[13px] text-gray-400">
                    ₱
                  </span>
                  <input
                    type="number"
                    min={GOODS_TYPE_VALUE_MIN}
                    max={GOODS_TYPE_VALUE_MAX}
                    {...form.register(`goodsTypeValues.${type.id}`, {
                      valueAsNumber: true,
                    })}
                    className={`${inputClass} w-full pl-7`}
                  />
                </div>
                {fieldError && (
                  <span className="mt-1 block text-[12px] text-red-600">
                    {fieldError.message}
                  </span>
                )}
              </label>
            )
          })}
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="text-[15px] font-semibold text-gray-900">Default View</h2>
        <p className="mt-1 text-[12px] text-gray-500">
          What the Rankings page opens on before anyone touches a control.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[13px] font-medium text-gray-700">Board</span>
            <select
              {...form.register('defaultBoard')}
              className={`${inputClass} mt-1.5 w-full`}
            >
              {RANKING_BOARDS.map((board) => (
                <option key={board.value} value={board.value}>
                  {board.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[13px] font-medium text-gray-700">Period</span>
            <select
              {...form.register('defaultPeriod')}
              className={`${inputClass} mt-1.5 w-full`}
            >
              {RANKING_PERIODS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="text-[15px] font-semibold text-gray-900">
          Tier Ladder &amp; Badges
        </h2>
        <p className="mt-1 text-[12px] text-gray-500">
          Tiers are assigned by standing, so the same badge means the same thing on
          both boards. Highest tier first. Each tier picks its own badge design and
          colours — the preview is what volunteers will see on the podium and in the
          standings.
        </p>

        <div className="mt-4">
          <RankingTierFields
            form={form}
            fields={tierFields}
            inputClass={inputClass}
            onAddTier={onAddTier}
            onRemoveTier={onRemoveTier}
            onMoveTier={onMoveTier}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onReset}
          className="h-9 rounded-lg border border-gray-200 bg-white px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
        >
          Restore defaults
        </button>
        <button
          type="submit"
          disabled={saving || !isDirty}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-4 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          Save changes
        </button>
      </div>
    </form>
  )
}
