import { create } from 'zustand'
import {
  deployCertificateTemplate,
  listDeployedCertificates,
  updateDeploymentStatus,
} from '../services/shared/deployed-certificate-service'
import type {
  DeployedCertificate,
  DeploymentStatus,
} from '../types/deployed-certificate'

interface DeployedCertificateState {
  deployments: DeployedCertificate[]
  loading: boolean
  /** False until the first fetch settles, so the header doesn't flash "0 of 0". */
  initialized: boolean
  /** True while a deploy or a status change is in flight. */
  saving: boolean
  error: string | null
  fetchDeployments: () => Promise<void>
  deployTemplate: (templateId: string, eventId: number) => Promise<DeployedCertificate>
  setStatus: (
    id: string,
    status: Exclude<DeploymentStatus, 'scheduled'>,
  ) => Promise<void>
}

export const useDeployedCertificateStore = create<DeployedCertificateState>((set) => ({
  deployments: [],
  loading: false,
  initialized: false,
  saving: false,
  error: null,

  fetchDeployments: async () => {
    set({ loading: true, error: null })
    try {
      const deployments = await listDeployedCertificates()
      set({ deployments, loading: false, initialized: true })
    } catch (error) {
      set({
        loading: false,
        initialized: true,
        error:
          error instanceof Error
            ? error.message
            : 'Deployed certificates could not be loaded',
      })
    }
  },

  deployTemplate: async (templateId, eventId) => {
    set({ saving: true })
    try {
      const deployment = await deployCertificateTemplate(templateId, eventId)
      // A re-deploy comes back with the id it already had, so the row is replaced when
      // it is one this page already lists and prepended when it is new.
      set((state) => ({
        saving: false,
        deployments: state.deployments.some((one) => one.id === deployment.id)
          ? state.deployments.map((one) =>
              one.id === deployment.id ? deployment : one,
            )
          : [deployment, ...state.deployments],
      }))
      return deployment
    } catch (error) {
      set({ saving: false })
      throw error instanceof Error ? error : new Error('The template could not be deployed')
    }
  },

  setStatus: async (id, status) => {
    set({ saving: true })
    try {
      const updated = await updateDeploymentStatus(id, status)
      set((state) => ({
        saving: false,
        deployments: state.deployments.map((one) => (one.id === id ? updated : one)),
      }))
    } catch (error) {
      set({ saving: false })
      throw error instanceof Error
        ? error
        : new Error('The deployment could not be updated')
    }
  },
}))
