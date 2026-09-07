import { create } from 'zustand'
import {
  createCertificateTemplate,
  deleteCertificateTemplate,
  listCertificateTemplates,
  saveCertificateTemplate,
} from '../services/shared/certificate-service'
import type {
  CertificateTemplate,
  CertificateTemplateInput,
  NewCertificateTemplateInput,
} from '../types/certificate-template'

interface CertificateTemplateState {
  templates: CertificateTemplate[]
  loading: boolean
  /** False until the first fetch settles, so the header doesn't flash "0 of 0". */
  initialized: boolean
  error: string | null
  saving: boolean
  fetchTemplates: () => Promise<void>
  saveTemplate: (id: string, input: CertificateTemplateInput) => Promise<void>
  createTemplate: (input: NewCertificateTemplateInput) => Promise<CertificateTemplate>
  removeTemplate: (id: string) => Promise<void>
}

export const useCertificateTemplateStore = create<CertificateTemplateState>((set) => ({
  templates: [],
  loading: false,
  saving: false,
  initialized: false,
  error: null,

  fetchTemplates: async () => {
    set({ loading: true, error: null })
    try {
      const templates = await listCertificateTemplates()
      set({ templates, loading: false, initialized: true })
    } catch (error) {
      set({
        loading: false,
        initialized: true,
        error:
          error instanceof Error
            ? error.message
            : 'Certificate templates could not be loaded',
      })
    }
  },

  saveTemplate: async (id, input) => {
    set({ saving: true })
    try {
      const saved = await saveCertificateTemplate(id, input)
      // The saved template replaces its own row rather than the list being refetched:
      // the customizer stays open on it, and a refetch would flash the gallery.
      set((state) => ({
        saving: false,
        templates: state.templates.map((one) => (one.id === id ? saved : one)),
      }))
    } catch (error) {
      set({ saving: false })
      throw error instanceof Error ? error : new Error('The template could not be saved')
    }
  },

  createTemplate: async (input) => {
    set({ saving: true })
    try {
      const created = await createCertificateTemplate(input)
      set((state) => ({ saving: false, templates: [created, ...state.templates] }))
      return created
    } catch (error) {
      set({ saving: false })
      throw error instanceof Error
        ? error
        : new Error('The template could not be created')
    }
  },

  removeTemplate: async (id) => {
    set({ saving: true })
    try {
      await deleteCertificateTemplate(id)
      set((state) => ({
        saving: false,
        templates: state.templates.filter((one) => one.id !== id),
      }))
    } catch (error) {
      set({ saving: false })
      throw error instanceof Error
        ? error
        : new Error('The template could not be deleted')
    }
  },
}))
