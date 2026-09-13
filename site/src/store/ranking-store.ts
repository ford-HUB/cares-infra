import { create } from 'zustand'
import { RANKING_DEFAULT_SETTINGS } from '../constants/ranking'
import {
  getRankingSettings,
  getRankingTrend,
  listDepartmentVolunteerRankings,
  listDonorRankings,
  listVolunteerRankings,
  updateRankingSettings,
  volunteerTrendOf,
} from '../services/shared/ranking-service'
import type {
  DonorRankingEntry,
  RankingSettings,
  RankingTrend,
  VolunteerRankingEntry,
} from '../types/ranking'

const EMPTY_TREND: RankingTrend = { labels: [], series: [] }

interface RankingState {
  settings: RankingSettings
  volunteers: VolunteerRankingEntry[]
  donors: DonorRankingEntry[]
  /** Top-three participation race, one trend per board. */
  volunteerTrend: RankingTrend
  donorTrend: RankingTrend
  loading: boolean
  saving: boolean
  /** False until the first fetch settles, so nothing renders shipped defaults first. */
  initialized: boolean
  /**
   * Which college the standings are counted for. A coordinator's board is scored from
   * their own department's attendance and has no donor side; undefined is the whole
   * school, both boards.
   */
  scopeDepartment?: string
  fetchRankings: (scopeDepartment?: string) => Promise<void>
  saveSettings: (settings: RankingSettings) => Promise<boolean>
}

/**
 * Settings and standings live together: the scoring rule is what produces the points,
 * so a saved change has to rescore both boards before the page can show them.
 */
export const useRankingStore = create<RankingState>((set, get) => ({
  settings: RANKING_DEFAULT_SETTINGS,
  volunteers: [],
  donors: [],
  volunteerTrend: EMPTY_TREND,
  donorTrend: EMPTY_TREND,
  loading: false,
  saving: false,
  initialized: false,

  fetchRankings: async (scopeDepartment) => {
    set({ loading: true, scopeDepartment })
    const settingsResult = await getRankingSettings()
    const settings = settingsResult.data

    if (scopeDepartment !== undefined) {
      const volunteerResult = await listDepartmentVolunteerRankings(scopeDepartment, settings)
      set({
        settings,
        volunteers: volunteerResult.data,
        donors: [],
        volunteerTrend: volunteerTrendOf(volunteerResult.data),
        donorTrend: EMPTY_TREND,
        loading: false,
        initialized: true,
      })
      return
    }

    const [volunteerResult, donorResult, volunteerTrend, donorTrend] = await Promise.all([
      listVolunteerRankings(settings),
      listDonorRankings(settings),
      getRankingTrend('volunteer', settings),
      getRankingTrend('donor', settings),
    ])

    set({
      settings,
      volunteers: volunteerResult.data,
      donors: donorResult.data,
      volunteerTrend: volunteerTrend.data,
      donorTrend: donorTrend.data,
      loading: false,
      initialized: true,
    })
  },

  saveSettings: async (settings) => {
    set({ saving: true })
    const result = await updateRankingSettings(settings)

    if (!result.success) {
      set({ saving: false })
      return false
    }

    set({ settings: result.data, saving: false })
    // The rates just changed, so the standings on file are stale by definition.
    await get().fetchRankings(get().scopeDepartment)
    return true
  },
}))
