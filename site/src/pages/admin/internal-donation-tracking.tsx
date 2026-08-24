import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { InternalDonationsBoard } from '../../components/internal-donations/internal-donations-board'
import { DonationDetailModal } from '../../components/internal-donations/ui/donation-detail-modal'
import {
  DONATION_STATUS_FILTER_ALL,
  DONATION_STATUS_LABELS,
  type DonationStatusFilter,
} from '../../constants/internal-donation'
import { useAuthStore, usePortalRole } from '../../store/auth-store'
import { useInternalDonationStore } from '../../store/internal-donation-store'
import type { DonationStatus } from '../../types/internal-donation'

export function InternalDonationTrackingPage() {
  const donations = useInternalDonationStore((s) => s.donations)
  const loading = useInternalDonationStore((s) => s.loading)
  const initialized = useInternalDonationStore((s) => s.initialized)
  const error = useInternalDonationStore((s) => s.error)
  const fetchDonations = useInternalDonationStore((s) => s.fetchDonations)
  const advance = useInternalDonationStore((s) => s.advance)

  const role = usePortalRole()
  const user = useAuthStore((s) => s.user)
  const actor = user ? `${user.firstName} ${user.lastName}` : 'Portal'

  const [statusFilter, setStatusFilter] = useState<DonationStatusFilter>(
    DONATION_STATUS_FILTER_ALL,
  )
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void fetchDonations()
  }, [fetchDonations])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()

    return donations
      .filter((donation) =>
        statusFilter === DONATION_STATUS_FILTER_ALL
          ? true
          : donation.status === statusFilter,
      )
      .filter((donation) =>
        term
          ? [donation.reference, donation.donor.name, donation.eventTitle]
              .join(' ')
              .toLowerCase()
              .includes(term)
          : true,
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [donations, statusFilter, search])

  const selected = donations.find((donation) => donation.id === selectedId) ?? null

  const handleAdvance = async (status: DonationStatus, note: string) => {
    if (!selected) return

    setSaving(true)
    try {
      const notified = await advance(selected.id, { status, note, actor })
      toast.success(
        `${selected.reference} marked ${DONATION_STATUS_LABELS[status]} — ${notified} notified`,
      )
      setSelectedId(null)
    } catch {
      toast.error('The donation could not be updated')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ContentShell variant="full">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Donation Tracking</h1>
        <p className="text-[13px] text-gray-500">
          Donations from pledge to confirmation. The donor is emailed on each step.
        </p>
      </div>

      <InternalDonationsBoard
        donations={visible}
        statusFilter={statusFilter}
        search={search}
        loading={loading}
        initialized={initialized}
        errored={Boolean(error)}
        onStatusFilterChange={setStatusFilter}
        onSearchChange={setSearch}
        onSelect={(donation) => setSelectedId(donation.id)}
      />

      <DonationDetailModal
        key={selected?.id ?? 'none'}
        donation={selected}
        saving={saving}
        canAct={role === 'director'}
        onClose={() => setSelectedId(null)}
        onAdvance={handleAdvance}
      />
    </ContentShell>
  )
}
