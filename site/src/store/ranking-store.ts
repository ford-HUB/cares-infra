import { create } from 'zustand'
import { RANKING_DEFAULT_SETTINGS } from '../constants/ranking'
import {
  getDonorRankingTrend,
  listDepartmentRankings,
  getRankingSettings,
  getVolunteerRankingTrend,
  listDonorRankings,
  listVolunteerRankings,
  updateRankingSettings,
} from '../services/shared/ranking-service'
import type {
  DepartmentRankings,
  DonorRankingEntry,
  RankingPeriod,
  RankingSettings,
  RankingTrend,
  VolunteerRankingEntry,
} from '../types/ranking'

const EMPTY_TREND: RankingTrend = { labels: [], series: [] }
const EMPTY_DEPARTMENTS: DepartmentRankings = {
  entries: [],
  unattributed: { hours: 0, donationAmount: 0 },
}

interface RankingState {
  settings: RankingSettings
  volunteers: VolunteerRankingEntry[]
  donors: DonorRankingEntry[]
  /** Colleges on volunteer hours and confirmed donations — school-wide. */
  departments: DepartmentRankings
  /** Top-three participation race, one trend per board. */
  volunteerTrend: RankingTrend
  donorTrend: RankingTrend
  /** The college the volunteer board is cut to — set for a coordinator, else null. */
  scopeDepartment: string | null
  /** The period the standings on file were counted over. */
  period: RankingPeriod | null
  loading: boolean
  saving: boolean
  /** False until the first fetch settles, so nothing renders shipped defaults first. */
  initialized: boolean
  error: string | null
  /**
   * Loads the settings and every board. The server scopes the volunteer board to the
   * caller, so a coordinator's college needs no passing in. Without a period the
   * saved default is used.
   */
  fetchRankings: (period?: RankingPeriod) => Promise<void>
  saveSettings: (settings: RankingSettings) => Promise<boolean>
}

/**
 * Settings and standings live together: the scoring rule is what produces the points,
 * so a saved change has to rescore the boards before the page can show them.
 */
export const useRankingStore = create<RankingState>((set, get) => ({
  settings: RANKING_DEFAULT_SETTINGS,
  volunteers: [],
  donors: [],
  departments: EMPTY_DEPARTMENTS,
  volunteerTrend: EMPTY_TREND,
  donorTrend: EMPTY_TREND,
  scopeDepartment: null,
  period: null,
  loading: false,
  saving: false,
  initialized: false,
  error: null,

  fetchRankings: async (period) => {
    set({ loading: true, error: null })
    const settingsResult = await getRankingSettings()
    const settings = settingsResult.data ?? get().settings
    const resolvedPeriod = period ?? settings.defaultPeriod

    const [volunteerResult, donorResult, volunteerTrend, donorTrend, departmentResult] =
      await Promise.all([
        listVolunteerRankings(resolvedPeriod),
        listDonorRankings(resolvedPeriod),
        getVolunteerRankingTrend(resolvedPeriod),
        getDonorRankingTrend(resolvedPeriod),
        listDepartmentRankings(resolvedPeriod),
      ])

    set({
      settings,
      volunteers: volunteerResult.data?.entries ?? [],
      scopeDepartment: volunteerResult.data?.department ?? null,
      donors: donorResult.data ?? [],
      departments: departmentResult.data ?? EMPTY_DEPARTMENTS,
      volunteerTrend: volunteerTrend.data ?? EMPTY_TREND,
      donorTrend: donorTrend.data ?? EMPTY_TREND,
      period: resolvedPeriod,
      loading: false,
      initialized: true,
      error: settingsResult.message ?? volunteerResult.message ?? null,
    })
  },

  saveSettings: async (settings) => {
    set({ saving: true })
    const result = await updateRankingSettings(settings)

    if (!result.success || !result.data) {
      set({ saving: false, error: result.message ?? null })
      return false
    }

    set({ settings: result.data, saving: false })
    // The rates just changed, so the standings on file are stale by definition.
    await get().fetchRankings(get().period ?? undefined)
    return true
  },
}))
