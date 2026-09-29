import { create } from 'zustand'
import toast from 'react-hot-toast'
import {
  fetchSystemDiagnostics,
  runSystemDiagnostics,
} from '../services/system-diagnostics-service'
import type { SystemDiagnostics } from '../types/system-diagnostics'

interface SystemDiagnosticsState {
  diagnostics: SystemDiagnostics | null
  /** False until the first read settles, so the board never flashes empty. */
  initialized: boolean
  error: string | null
  /** True while a staff-pressed check is running — the button locks. */
  running: boolean
  fetchDiagnostics: (options?: { silent?: boolean }) => Promise<void>
  runNow: () => Promise<void>
}

export const useSystemDiagnosticsStore = create<SystemDiagnosticsState>((set) => ({
  diagnostics: null,
  initialized: false,
  error: null,
  running: false,

  fetchDiagnostics: async (options) => {
    if (!options?.silent) set({ error: null })
    try {
      set({ diagnostics: await fetchSystemDiagnostics(), error: null, initialized: true })
    } catch {
      set({
        initialized: true,
        error: 'Could not read the diagnostics report. The control plane may be down.',
      })
    }
  },

  runNow: async () => {
    set({ running: true })
    try {
      const diagnostics = await runSystemDiagnostics()
      set({ diagnostics, error: null, initialized: true })
      const failing =
        diagnostics.report?.checks.filter((one) => one.status === 'fail').length ?? 0
      if (failing > 0) toast.error(`${failing} check(s) failing — see the board below.`)
      else toast.success('Diagnostics complete — all checks passed.')
    } catch {
      toast.error('The diagnostics check could not run.')
    } finally {
      set({ running: false })
    }
  },
}))
