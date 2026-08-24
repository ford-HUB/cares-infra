import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ManageUsersTable } from '../../components/manage-users/manage-users-table'
import { ManageUsersToolbar } from '../../components/manage-users/manage-users-toolbar'
import { AddUserModal } from '../../components/manage-users/ui/add-user-modal'
import { BlockIpModal } from '../../components/manage-users/ui/block-ip-modal'
import { ReissueCredentialsModal } from '../../components/manage-users/ui/reissue-credentials-modal'
import { RestrictUserModal } from '../../components/manage-users/ui/restrict-user-modal'
import { UserDetailsModal } from '../../components/manage-users/ui/user-details-modal'
import { ContentShell } from '../../components/portal/ui/content-shell'
import {
  USER_ROLE_FILTER_ALL,
  USER_STATUS_FILTER_ALL,
  type UserStatusFilter,
} from '../../constants/manage-users'
import { useProvisionUserForm } from '../../hooks/use-provision-user-form'
import { usePortalRole } from '../../store/auth-store'
import { useManageUsersStore } from '../../store/manage-users-store'
import { getManagedUserDetail } from '../../services/manage-user-service'
import type {
  IssuedCredentials,
  ManagedUser,
  ManagedUserDetail,
} from '../../types/manage-users'
import { exportUsersCsv } from '../../utils/export-users-csv'

export function ManageUsersPage() {
  const {
    users,
    loading,
    initialized,
    truncated,
    total,
    fetchUsers,
    restrictUser,
    unrestrictUser,
    blockUserIp,
    unblockUserIp,
    reissueCredentials,
  } = useManageUsersStore()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>(USER_ROLE_FILTER_ALL)
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>(USER_STATUS_FILTER_ALL)
  const [page, setPage] = useState(1)

  const [detailsUser, setDetailsUser] = useState<ManagedUser | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [detail, setDetail] = useState<ManagedUserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | undefined>()
  const [restrictingUser, setRestrictingUser] = useState<ManagedUser | null>(null)
  const [blockingIpUser, setBlockingIpUser] = useState<ManagedUser | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [reissueUser, setReissueUser] = useState<ManagedUser | null>(null)
  const [reissued, setReissued] = useState<IssuedCredentials | null>(null)

  const provision = useProvisionUserForm()
  // A director asks for an account; an administrator issues it — the same split the
  // server enforces, so the controls a director cannot use are not shown to them.
  const canProvision = usePortalRole() === 'admin'

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return users.filter((user) => {
      const matchesSearch =
        !term ||
        user.email.toLowerCase().includes(term) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(term)
      const matchesRole = roleFilter === USER_ROLE_FILTER_ALL || user.role === roleFilter
      const matchesStatus =
        statusFilter === USER_STATUS_FILTER_ALL || user.status === statusFilter
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [search, roleFilter, statusFilter, users])

  const roles = useMemo(() => [...new Set(users.map((user) => user.role))], [users])
  const activeCount = users.filter((user) => user.status === 'active').length

  const resetToFirstPage = <T,>(apply: (value: T) => void) => (value: T) => {
    apply(value)
    setPage(1)
  }

  const runMutation = useCallback(
    async (
      action: () => Promise<{ ok: boolean; message?: string }>,
      fallback: string,
    ) => {
      setSubmitting(true)
      const result = await action()
      setSubmitting(false)

      if (result.ok) {
        toast.success(result.message ?? fallback)
      } else {
        toast.error(result.message ?? 'The request could not be completed')
      }
      return result.ok
    },
    [],
  )

  const handleConfirmRestrict = async (reason: string) => {
    if (!restrictingUser) return
    const ok = await runMutation(
      () => restrictUser(restrictingUser.id, reason),
      `${restrictingUser.firstName} ${restrictingUser.lastName} restricted`,
    )
    if (ok) setRestrictingUser(null)
  }

  const handleConfirmBlockIp = async (payload: { ipAddress: string; reason: string }) => {
    if (!blockingIpUser) return
    const ok = await runMutation(
      () =>
        blockUserIp(blockingIpUser.id, {
          ipAddress: payload.ipAddress,
          reason: payload.reason || undefined,
        }),
      `${payload.ipAddress} blocked`,
    )
    if (ok) setBlockingIpUser(null)
  }

  const handleUnrestrict = useCallback(
    (user: ManagedUser) => {
      void runMutation(
        () => unrestrictUser(user.id),
        `Restriction lifted for ${user.firstName} ${user.lastName}`,
      )
    },
    [runMutation, unrestrictUser],
  )

  const handleUnblockIp = useCallback(
    (user: ManagedUser) => {
      void runMutation(
        () => unblockUserIp(user.id),
        `IP unblocked for ${user.firstName} ${user.lastName}`,
      )
    },
    [runMutation, unblockUserIp],
  )

  const handleConfirmReissue = async (expiresInHours: number) => {
    if (!reissueUser) return

    setSubmitting(true)
    const result = await reissueCredentials(reissueUser.id, expiresInHours)
    setSubmitting(false)

    if (result.ok && result.credentials) {
      setReissued(result.credentials)
      toast.success(result.message ?? 'New credentials issued')
    } else {
      toast.error(result.message ?? 'The credentials could not be issued')
    }
  }

  const closeReissue = () => {
    setReissueUser(null)
    setReissued(null)
  }

  const closeDetails = () => {
    setDetailsUser(null)
    setPanelOpen(false)
    setDetail(null)
    setDetailError(undefined)
  }

  const handleOpenPanel = async () => {
    if (!detailsUser) return
    setPanelOpen(true)

    // Already loaded for this row — reuse it instead of refetching.
    if (detail?.id === detailsUser.id) return

    setDetailLoading(true)
    setDetailError(undefined)
    const result = await getManagedUserDetail(detailsUser.id)
    setDetailLoading(false)

    if (result.success && result.detail) {
      setDetail(result.detail)
    } else {
      setDetail(null)
      setDetailError(result.message ?? 'Full information could not be loaded')
    }
  }

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      <ManageUsersToolbar
        search={search}
        role={roleFilter}
        status={statusFilter}
        roles={roles}
        shown={filtered.length}
        total={users.length}
        active={activeCount}
        initialized={initialized}
        onSearchChange={resetToFirstPage(setSearch)}
        onRoleChange={resetToFirstPage(setRoleFilter)}
        onStatusChange={resetToFirstPage(setStatusFilter)}
        onExport={() => exportUsersCsv(filtered)}
        onAddUser={canProvision ? () => setAddUserOpen(true) : undefined}
      />

      {truncated && (
        <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          Showing the first {users.length} of {total} accounts. Narrow the search to
          reach the rest.
        </p>
      )}

      <ManageUsersTable
        users={filtered}
        loading={loading}
        initialized={initialized}
        page={page}
        onPageChange={setPage}
        onView={setDetailsUser}
        onRestrict={setRestrictingUser}
        onUnrestrict={handleUnrestrict}
        onBlockIp={setBlockingIpUser}
        onUnblockIp={handleUnblockIp}
        onReissueCredentials={canProvision ? setReissueUser : undefined}
      />

      <UserDetailsModal
        user={detailsUser}
        detail={detail}
        detailLoading={detailLoading}
        detailError={detailError}
        panelOpen={panelOpen}
        onOpenPanel={() => void handleOpenPanel()}
        onClosePanel={() => setPanelOpen(false)}
        onClose={closeDetails}
      />

      <RestrictUserModal
        key={`restrict-${restrictingUser?.id}`}
        user={restrictingUser}
        loading={submitting}
        onClose={() => setRestrictingUser(null)}
        onConfirm={(reason) => void handleConfirmRestrict(reason)}
      />

      <BlockIpModal
        key={`block-ip-${blockingIpUser?.id}`}
        user={blockingIpUser}
        loading={submitting}
        onClose={() => setBlockingIpUser(null)}
        onConfirm={(payload) => void handleConfirmBlockIp(payload)}
      />

      <ReissueCredentialsModal
        key={`reissue-${reissueUser?.id}`}
        user={reissueUser}
        credentials={reissued}
        loading={submitting}
        onClose={closeReissue}
        onConfirm={(hours) => void handleConfirmReissue(hours)}
      />

      <AddUserModal
        {...provision}
        open={addUserOpen}
        onClose={() => setAddUserOpen(false)}
      />
    </ContentShell>
  )
}
