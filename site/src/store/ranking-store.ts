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
  departments: DepartmentRankings
  volunteerTrend: RankingTrend
  donorTrend: RankingTrend
  scopeDepartment: string | null
  period: RankingPeriod | null
  loading: boolean
  saving: boolean
  initialized: boolean
  error: string | null
  fetchRankings: (period?: RankingPeriod) => Promise<void>
  saveSettings: (settings: RankingSettings) => Promise<boolean>
}

/** Saved scoring changes must rescore the boards. */
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
    await get().fetchRankings(get().period ?? undefined)
    return true
  },
}))
