import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useDeployedCertificateStore } from '../store/deployed-certificate-store'
import { useEventStore } from '../store/event-store'
import type { CertificateTemplate } from '../types/certificate-template'
import type { DeployedCertificate } from '../types/deployed-certificate'

export function useDeployTemplate(
  template: CertificateTemplate | null,
  onDeployed: (deployment: DeployedCertificate) => void,
) {
  const events = useEventStore((state) => state.events)
  const eventsInitialized = useEventStore((state) => state.initialized)
  const fetchEvents = useEventStore((state) => state.fetchEvents)
  const deployTemplate = useDeployedCertificateStore((state) => state.deployTemplate)
  const deployments = useDeployedCertificateStore((state) => state.deployments)
  const deploymentsInitialized = useDeployedCertificateStore((state) => state.initialized)
  const fetchDeployments = useDeployedCertificateStore((state) => state.fetchDeployments)
  const saving = useDeployedCertificateStore((state) => state.saving)

  /** Keyed by template so switching templates resets without an effect. */
  const [picked, setPicked] = useState<{
    templateId: string
    eventId: number | null
    search: string
  }>({ templateId: '', eventId: null, search: '' })

  const templateId = template?.id ?? ''
  const current =
    picked.templateId === templateId
      ? picked
      : { templateId, eventId: null, search: '' }

  const { eventId, search } = current
  const setEventId = (next: number | null) => setPicked({ ...current, eventId: next })
  const setSearch = (next: string) => setPicked({ ...current, search: next })

  useEffect(() => {
    if (!template) return
    if (!eventsInitialized) void fetchEvents()
    if (!deploymentsInitialized) void fetchDeployments()
  }, [
    template,
    eventsInitialized,
    fetchEvents,
    deploymentsInitialized,
    fetchDeployments,
  ])

  const deployedEventIds = useMemo(() => {
    if (!template) return new Set<string>()

    return new Set(
      deployments
        .filter((one) => one.templateId === template.id)
        .map((one) => one.event.id),
    )
  }, [deployments, template])

  const options = useMemo(() => {
    const term = search.trim().toLowerCase()

    return events
      .filter((event) => event.status !== 'Cancelled')
      .filter(
        (event) =>
          !term ||
          event.title.toLowerCase().includes(term) ||
          event.location.toLowerCase().includes(term),
      )
      .sort((a, b) => b.event_started.localeCompare(a.event_started))
  }, [events, search])

  const submit = async () => {
    if (!template || eventId === null) return

    try {
      const deployment = await deployTemplate(template.id, eventId)
      toast.success(`${template.name} deployed to ${deployment.event.name}`)
      onDeployed(deployment)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'The template could not be deployed',
      )
    }
  }

  return {
    options,
    loading: !eventsInitialized,
    eventId,
    setEventId,
    search,
    setSearch,
    deployedEventIds,
    saving,
    submit,
  }
}
