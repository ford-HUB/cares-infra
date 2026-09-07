import { create } from 'zustand'
import {
  createReportFolder,
  decideMonthlyReport,
  deleteReportFolder,
  fetchMonthlyReports,
  fetchReportFolders,
  moveReportToFolder,
  renameReportFolder,
  type MonthlyReportDecision,
} from '../services/monthly-report-service'
import { parseApiError } from '../services/api-client'
import type { MonthlyReport, ReportFolder } from '../types/monthly-report'

interface MonthlyReportState {
  reports: MonthlyReport[]
  /** Director-made folders; department folders are derived in the view. */
  folders: ReportFolder[]
  loading: boolean
  /** False until the first fetch settles, so the pipeline doesn't flash zeroes. */
  initialized: boolean
  error: string | null
  fetchReports: () => Promise<void>
  decide: (id: string, decision: MonthlyReportDecision) => Promise<void>
  createFolder: (name: string) => Promise<void>
  renameFolder: (id: string, name: string) => Promise<void>
  removeFolder: (id: string) => Promise<void>
  moveToFolder: (reportId: string, folderId: string | null) => Promise<void>
}

/** Replaces one report in place, so the queue and the library both see the decision. */
function replaceReport(reports: MonthlyReport[], updated: MonthlyReport) {
  return reports.map((report) => (report.id === updated.id ? updated : report))
}

/**
 * A report belongs to at most one folder, so filing it into one takes it out of every
 * other. Applied locally off the server's answer rather than refetching the folder
 * list — the move is already decided by the time it comes back.
 */
function refileReport(
  folders: ReportFolder[],
  reportId: string,
  folderId: string | null,
) {
  return folders.map((folder) => {
    const without = folder.reportIds.filter((id) => id !== reportId)
    return {
      ...folder,
      reportIds: folder.id === folderId ? [reportId, ...without] : without,
    }
  })
}

export const useMonthlyReportStore = create<MonthlyReportState>((set) => ({
  reports: [],
  folders: [],
  loading: false,
  initialized: false,
  error: null,

  fetchReports: async () => {
    set({ loading: true, error: null })
    try {
      const [reports, folders] = await Promise.all([
        fetchMonthlyReports(),
        fetchReportFolders(),
      ])
      set({ reports, folders, loading: false, initialized: true })
    } catch (error) {
      set({
        loading: false,
        initialized: true,
        error: parseApiError(error),
      })
    }
  },

  decide: async (id, decision) => {
    const updated = await decideMonthlyReport(id, decision)
    set((state) => ({ reports: replaceReport(state.reports, updated) }))
  },

  createFolder: async (name) => {
    const folder = await createReportFolder(name)
    set((state) => ({ folders: [...state.folders, folder] }))
  },

  renameFolder: async (id, name) => {
    const folder = await renameReportFolder(id, name)
    set((state) => ({
      folders: state.folders.map((one) => (one.id === id ? folder : one)),
    }))
  },

  removeFolder: async (id) => {
    await deleteReportFolder(id)
    set((state) => ({ folders: state.folders.filter((one) => one.id !== id) }))
  },

  moveToFolder: async (reportId, folderId) => {
    const updated = await moveReportToFolder(reportId, folderId)
    set((state) => ({
      reports: replaceReport(state.reports, updated),
      folders: refileReport(state.folders, reportId, folderId),
    }))
  },
}))
