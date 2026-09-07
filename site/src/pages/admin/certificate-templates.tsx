import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CertificateTemplateCustomizer } from '../../components/certificate-templates/certificate-template-customizer'
import { CertificateTemplateDetail } from '../../components/certificate-templates/certificate-template-detail'
import { CertificateTemplateGallery } from '../../components/certificate-templates/certificate-template-gallery'
import { CertificateTemplateTable } from '../../components/certificate-templates/certificate-template-table'
import { CertificateTemplatesToolbar } from '../../components/certificate-templates/certificate-templates-toolbar'
import { DeployTemplateDialog } from '../../components/certificate-templates/deploy-template-dialog'
import { NewCertificateTemplateDialog } from '../../components/certificate-templates/new-certificate-template-dialog'
import { CertificateTemplateDeleteDialog } from '../../components/certificate-templates/ui/certificate-template-delete-dialog'
import { CertificateTemplatesEmpty } from '../../components/certificate-templates/ui/certificate-templates-empty'
import { ContentShell } from '../../components/portal/ui/content-shell'
import {
  TEMPLATE_CATEGORY_FILTER_ALL,
  TEMPLATE_STATUS_FILTER_ALL,
  type TemplateCategoryFilter,
  type TemplateStatusFilter,
  type TemplateViewMode,
} from '../../constants/certificate-templates'
import { ADMIN_DEPLOYED_CERTIFICATES_PATH } from '../../constants/routes'
import { countCertificateTemplates } from '../../services/shared/certificate-service'
import { useCertificateTemplateStore } from '../../store/certificate-template-store'
import type {
  CertificateTemplate,
  CertificateTemplateStatus,
} from '../../types/certificate-template'

export function CertificateTemplatesPage() {
  const navigate = useNavigate()
  const templates = useCertificateTemplateStore((s) => s.templates)
  const loading = useCertificateTemplateStore((s) => s.loading)
  const initialized = useCertificateTemplateStore((s) => s.initialized)
  const error = useCertificateTemplateStore((s) => s.error)
  const fetchTemplates = useCertificateTemplateStore((s) => s.fetchTemplates)
  const saveTemplate = useCertificateTemplateStore((s) => s.saveTemplate)
  const removeTemplate = useCertificateTemplateStore((s) => s.removeTemplate)
  const saving = useCertificateTemplateStore((s) => s.saving)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TemplateStatusFilter>(TEMPLATE_STATUS_FILTER_ALL)
  const [category, setCategory] = useState<TemplateCategoryFilter>(
    TEMPLATE_CATEGORY_FILTER_ALL,
  )
  const [view, setView] = useState<TemplateViewMode>('grid')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [customizingId, setCustomizingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deployingId, setDeployingId] = useState<string | null>(null)

  useEffect(() => {
    void fetchTemplates()
  }, [fetchTemplates])

  // Counted over every template, so the toolbar's total does not move with a filter.
  const counts = useMemo(() => countCertificateTemplates(templates), [templates])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()

    return templates.filter((template) => {
      if (status !== TEMPLATE_STATUS_FILTER_ALL && template.status !== status) {
        return false
      }
      if (category !== TEMPLATE_CATEGORY_FILTER_ALL && template.category !== category) {
        return false
      }
      if (!term) return true

      return (
        template.name.toLowerCase().includes(term) ||
        template.reference.toLowerCase().includes(term)
      )
    })
  }, [templates, search, status, category])

  const selected = useMemo(
    () => visible.find((template) => template.id === selectedId) ?? null,
    [visible, selectedId],
  )

  // Kept off `visible`: a template stays open in the customizer even when the edit
  // being saved (a status change, say) drops it out of the current filter.
  const customizing = useMemo(
    () => templates.find((template) => template.id === customizingId) ?? null,
    [templates, customizingId],
  )

  const deleting = useMemo(
    () => templates.find((template) => template.id === deletingId) ?? null,
    [templates, deletingId],
  )

  const deploying = useMemo(
    () => templates.find((template) => template.id === deployingId) ?? null,
    [templates, deployingId],
  )

  const showSkeleton = !initialized || (loading && templates.length === 0)
  const filtered =
    search.trim().length > 0 ||
    status !== TEMPLATE_STATUS_FILTER_ALL ||
    category !== TEMPLATE_CATEGORY_FILTER_ALL

  const clearFilters = () => {
    setSearch('')
    setStatus(TEMPLATE_STATUS_FILTER_ALL)
    setCategory(TEMPLATE_CATEGORY_FILTER_ALL)
  }

  const select = (template: CertificateTemplate) =>
    setSelectedId((current) => (current === template.id ? null : template.id))

  /**
   * Archiving and restoring are status edits, so they go through the same save the
   * customizer uses rather than an endpoint of their own — the template is submitted
   * whole either way. Duplicate and download still wait on their own endpoints.
   */
  const applyStatus = async (
    template: CertificateTemplate,
    next: CertificateTemplateStatus,
  ) => {
    try {
      await saveTemplate(template.id, {
        name: template.name,
        description: template.description,
        category: template.category,
        status: next,
        orientation: template.orientation,
        design: template.design,
      })
      toast.success(
        next === 'archived'
          ? `${template.name} archived`
          : `${template.name} restored to drafts`,
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'The template could not be saved',
      )
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return

    try {
      await removeTemplate(deleting.id)
      toast.success(`${deleting.name} deleted`)
      if (selectedId === deleting.id) setSelectedId(null)
      setDeletingId(null)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'The template could not be deleted',
      )
    }
  }

  const handleAction = (action: string, template: CertificateTemplate) => {
    if (action === 'customize') {
      setCustomizingId(template.id)
      return
    }
    if (action === 'archive' || action === 'restore') {
      void applyStatus(template, action === 'archive' ? 'archived' : 'draft')
      return
    }
    if (action === 'delete') {
      setDeletingId(template.id)
      return
    }
    if (action === 'deploy') {
      setDeployingId(template.id)
      return
    }
    toast(`${action} · ${template.name} — not wired yet`)
  }

  return (
    <ContentShell variant="full">
      <CertificateTemplatesToolbar
        search={search}
        status={status}
        category={category}
        view={view}
        shown={visible.length}
        total={counts.total}
        initialized={initialized}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onCategoryChange={setCategory}
        onViewChange={setView}
        onCreate={() => setCreating(true)}
      />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          {!showSkeleton && visible.length === 0 ? (
            <CertificateTemplatesEmpty
              filtered={filtered}
              errored={Boolean(error)}
              onClearFilters={clearFilters}
              onCreate={() => setCreating(true)}
            />
          ) : view === 'grid' ? (
            <CertificateTemplateGallery
              templates={visible}
              showSkeleton={showSkeleton}
              selectedId={selected?.id}
              onSelect={select}
              onAction={handleAction}
            />
          ) : (
            <CertificateTemplateTable
              templates={visible}
              showSkeleton={showSkeleton}
              selectedId={selected?.id}
              onSelect={select}
              onAction={handleAction}
            />
          )}
        </div>

        {selected && (
          <CertificateTemplateDetail
            template={selected}
            onClose={() => setSelectedId(null)}
            onAction={handleAction}
          />
        )}
      </div>

      {customizing && (
        <CertificateTemplateCustomizer
          template={customizing}
          open
          onOpenChange={(next) => !next && setCustomizingId(null)}
        />
      )}

      <NewCertificateTemplateDialog
        open={creating}
        onOpenChange={setCreating}
        // Filing a template and designing it is one errand, so the customizer opens on
        // the new draft the moment it exists.
        onCreated={(template) => {
          setCreating(false)
          setCustomizingId(template.id)
        }}
      />

      <DeployTemplateDialog
        template={deploying}
        onOpenChange={(next) => !next && setDeployingId(null)}
        onDeployed={() => {
          setDeployingId(null)
          // The template's "deployed to N events" tally is kept server-side, so the
          // card is re-read rather than guessed at here.
          void fetchTemplates()
          navigate(ADMIN_DEPLOYED_CERTIFICATES_PATH)
        }}
      />

      <CertificateTemplateDeleteDialog
        template={deleting}
        deleting={saving}
        onCancel={() => setDeletingId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </ContentShell>
  )
}
