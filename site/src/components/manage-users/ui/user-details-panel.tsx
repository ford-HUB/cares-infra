import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthenticatedImage } from '../../../hooks/use-authenticated-image'
import { PORTAL_ROLE_VALUES, VERIFICATION_STATUS_LABELS } from '../../../constants/manage-users'
import type { ManagedUserDetail } from '../../../types/manage-users'
import { UserDetailsPanelSkeleton } from './user-details-panel-skeleton'

interface UserDetailsPanelProps {
  detail: ManagedUserDetail | null
  loading: boolean
  error?: string
  onClose: () => void
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-gray-100 px-5 py-4 last:border-b-0">
      <h4 className="mb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
        {title}
      </h4>
      {children}
    </section>
  )
}

function Field({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="shrink-0 text-[13px] text-gray-500">{label}</span>
      <span className="text-right text-[13px] font-medium break-words text-gray-900">
        {value === undefined || value === '' ? 'N/A' : value}
      </span>
    </div>
  )
}

function formatDate(value?: string) {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
}

/** Sits beside the centred details modal and scrolls on its own. */
export function UserDetailsPanel({
  detail,
  loading,
  error,
  onClose,
}: UserDetailsPanelProps) {
  const isPortalUser = detail ? PORTAL_ROLE_VALUES.includes(detail.role) : false
  const signature = useAuthenticatedImage(
    detail?.hasSignature ? `/api/v1/users/${detail.id}/signature` : null,
  )

  return (
    <div className="flex max-h-[88vh] min-h-[28rem] w-[28rem] max-w-[calc(100vw-2rem)] shrink-0 flex-col overflow-hidden rounded-xl bg-white shadow-lg">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-900">Full information</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close full information"
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && <UserDetailsPanelSkeleton />}

        {!loading && error && (
          <p className="px-5 py-8 text-center text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && detail && (
          <>
            <Section title="Personal">
              <Field
                label="Full name"
                value={[detail.firstName, detail.middleName, detail.lastName]
                  .filter(Boolean)
                  .join(' ')}
              />
              <Field label="Gender" value={detail.gender} />
              <Field label="Age" value={detail.age} />
              <Field label="Phone" value={detail.phoneNumber} />
              <Field label="Email" value={detail.email} />
            </Section>

            <Section title="Address">
              <Field label="Current address" value={detail.currentAddress} />
              <Field label="Street" value={detail.address.street} />
              <Field label="Barangay" value={detail.address.barangay} />
              <Field label="City" value={detail.address.city} />
              <Field label="Province" value={detail.address.province} />
            </Section>

            <Section title="Account">
              <Field label="Role" value={<span className="capitalize">{detail.role}</span>} />
              <Field label="Department" value={detail.department} />
              <Field label="Status" value={<span className="capitalize">{detail.status}</span>} />
              <Field label="Restriction reason" value={detail.restrictionReason} />
              <Field label="Restricted at" value={formatDate(detail.restrictedAt)} />
              <Field label="Registered" value={formatDate(detail.createdAt)} />
              <Field label="Last updated" value={formatDate(detail.updatedAt)} />
              <Field
                label="User ID"
                value={<span className="font-mono text-xs">{detail.id}</span>}
              />
            </Section>

            {detail.schoolInfo && (
              <Section title="School">
                <Field label="ID number" value={detail.schoolInfo.idNumber} />
                <Field label="Department" value={detail.schoolInfo.department} />
                <Field label="Major" value={detail.schoolInfo.major} />
                <Field label="Year level" value={detail.schoolInfo.yearLevel} />
                <Field label="Graduation" value={detail.schoolInfo.graduationDate} />
              </Section>
            )}

            {detail.interests.length > 0 && (
              <Section title="Interests">
                <div className="flex flex-wrap gap-1.5">
                  {detail.interests.map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Network">
              <Field label="Last sign-in IP" value={detail.lastLoginIp} />
              {detail.blockedIpDetails.length === 0 ? (
                <Field label="Blocked IPs" value="None" />
              ) : (
                detail.blockedIpDetails.map((blocked) => (
                  <Field
                    key={blocked.ipAddress}
                    label={blocked.ipAddress}
                    value={
                      <>
                        <span className="block">{formatDate(blocked.blockedAt)}</span>
                        {blocked.reason && (
                          <span className="block text-[11px] font-normal text-gray-500">
                            {blocked.reason}
                          </span>
                        )}
                      </>
                    }
                  />
                ))
              )}
            </Section>

            <Section title="Verification">
              {detail.verifications.length === 0 ? (
                <p className="text-[13px] text-gray-500">No submissions.</p>
              ) : (
                detail.verifications.map((verification) => (
                  <Field
                    key={verification.submittedAt}
                    label={VERIFICATION_STATUS_LABELS[verification.status]}
                    value={formatDate(verification.submittedAt)}
                  />
                ))
              )}
            </Section>

            {isPortalUser && (
              <Section title="Signature">
                {!detail.hasSignature && (
                  <p className="text-[13px] text-gray-500">No signature on file.</p>
                )}
                {detail.hasSignature && signature.loading && (
                  // Matches the loaded <img>'s max-h-32 box minus its p-2 padding.
                  <Skeleton className="h-28 w-full rounded-lg" aria-hidden />
                )}
                {detail.hasSignature && signature.failed && (
                  <p className="text-[13px] text-red-600">Signature could not be loaded.</p>
                )}
                {signature.objectUrl && (
                  <img
                    src={signature.objectUrl}
                    alt={`Signature of ${detail.firstName} ${detail.lastName}`}
                    className="max-h-32 w-full rounded-lg border border-gray-200 bg-white object-contain p-2"
                  />
                )}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
