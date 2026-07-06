import { Download, MoreVertical, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { StatusPill } from '../../components/portal/ui/page-chrome'
import { useManageUsersStore } from '../../store/manage-users-store'

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}

export function ManageUsersPage() {
  const { users, loading, fetchUsers } = useManageUsersStore()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return users.filter((user) => {
      const matchesSearch =
        !term ||
        user.email.toLowerCase().includes(term) ||
        user.firstName.toLowerCase().includes(term) ||
        user.lastName.toLowerCase().includes(term)
      const matchesRole = !roleFilter || user.role === roleFilter
      const matchesStatus = !statusFilter || user.status === statusFilter
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [search, roleFilter, statusFilter, users])

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginated = filtered.slice(startIndex, startIndex + rowsPerPage)
  const uniqueRoles = [...new Set(users.map((u) => u.role))]
  const uniqueStatuses = [...new Set(users.map((u) => u.status))]

  return (
    <ContentShell variant="full">
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                {filtered.length} of {users.length} users
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-sm text-gray-600">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span>{users.filter((u) => u.status === 'active').length} active</span>
            </div>
          </div>

          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search users..."
              className="w-full rounded-lg border border-gray-300 py-2.5 pr-4 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700"
            >
              <option value="">All Roles</option>
              {uniqueRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700"
            >
              <option value="">All Status</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Full Name</th>
                <th className="px-6 py-4 text-left font-semibold">Email</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-left font-semibold">Role</th>
                <th className="px-6 py-4 text-left font-semibold">Department</th>
                <th className="px-6 py-4 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Loading users...
                  </td>
                </tr>
              )}
              {!loading &&
                paginated.map((user, index) => (
                  <tr
                    key={user.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                          <span className="text-sm font-medium text-white">
                            {getInitials(user.firstName, user.lastName)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <StatusPill status={user.status} />
                    </td>
                    <td className="px-6 py-4 capitalize text-gray-600">{user.role}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {user.department ?? 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                        aria-label="More actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
          <p className="text-sm text-gray-600">
            Showing {paginated.length === 0 ? 0 : startIndex + 1}-
            {Math.min(startIndex + rowsPerPage, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </ContentShell>
  )
}
