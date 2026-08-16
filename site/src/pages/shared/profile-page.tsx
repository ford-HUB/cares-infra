import { ChevronRight, Pencil, Plus, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthenticatedProfileImage } from '../../components/profile/ui/authenticated-profile-image'
import { ProfileFormModal } from '../../components/profile/profile-form-modal'
import { ProfilePageSkeleton } from '../../components/profile/ui/profile-page-skeleton'
import { useProfileForm } from '../../hooks/use-profile-form'
import { useAuthStore } from '../../store/auth-store'
import { useProfileStore } from '../../store/profile-store'
import { genderLabel, isPortalProfileComplete } from '../../utils/profile-helpers'

interface ProfilePageProps {
  homePath: string
}

function getInitial(firstname?: string) {
  return firstname?.[0]?.toUpperCase() ?? '?'
}

function roleLabel(role?: string) {
  switch (role) {
    case 'admin':
      return 'Admin'
    case 'coordinator':
      return 'Coordinator'
    case 'director':
      return 'Director'
    default:
      return 'User'
  }
}

export function ProfilePage({ homePath }: ProfilePageProps) {
  const user = useAuthStore((s) => s.user)
  const { profile, loading, initialized, ensureProfile } = useProfileStore()
  const [modalOpen, setModalOpen] = useState(false)

  const isDirector = user?.role === 'director'
  const profileComplete = isPortalProfileComplete(profile, {
    requireSignature: isDirector,
    isDirector,
  })

  useEffect(() => {
    void ensureProfile()
  }, [ensureProfile])

  const profileForm = useProfileForm({
    profile,
    isDirector,
    onSuccess: () => setModalOpen(false),
  })

  // `!initialized` covers the mount render, before the effect has flipped `loading`.
  if (!initialized || (loading && !profile)) {
    return <ProfilePageSkeleton homePath={homePath} />
  }

  return (
    <div className="mx-8 my-4 flex h-full flex-col">
      <header className="flex flex-row items-center justify-between p-4">
        <h1 className="text-xl text-gray-700">Profile</h1>
        <div className="flex space-x-2.5">
          <Link to={homePath} className="text-gray-500">
            Home
          </Link>
          <ChevronRight size={18} className="relative top-0.5" />
          <span>Profile</span>
        </div>
      </header>

      <main className="my-4 flex w-full flex-col rounded-xl border border-gray-300 bg-white">
        <div className="title flex items-center justify-between p-6">
          <h1>Profile</h1>
          {!profileComplete && (
            <div className="flex items-center space-x-2.5 rounded-xl bg-red-50 px-5 py-2">
              <TriangleAlert className="h-4 w-4 text-red-600" />
              <h2 className="text-red-600">Please Update Your Profile.</h2>
            </div>
          )}
        </div>

        <div className="profile-header m-4 flex justify-between rounded-xl border border-gray-300">
          <div className="m-4 inline-flex items-center">
            {profile?.hasProfileImage ? (
              <AuthenticatedProfileImage
                asset="avatar"
                alt="profile"
                className="avatar mx-3 h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <span className="mx-3 flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-5xl font-medium text-white">
                {getInitial(profile?.firstname)}
              </span>
            )}
            <div className="mx-4 space-y-1.5">
              <h2 className="text-2xl font-semibold">
                {profile?.firstname ?? ''} {profile?.lastname ?? ''}
              </h2>
              <div className="flex items-center space-x-2 text-gray-600">
                <span className="text-sm">{roleLabel(user?.role)}</span>
                {!isDirector && (
                  <>
                    <span className="h-4 w-px bg-gray-300" />
                    <span className="text-sm">{profile?.department ?? 'CARES'}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="m-4 flex items-center">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex cursor-pointer items-center rounded-3xl border border-gray-400 px-6 py-2.5"
            >
              {profileComplete ? (
                <>
                  <Pencil className="relative right-1.5 h-3.5 w-3.5 font-bold" /> Edit
                </>
              ) : (
                <>
                  <Plus className="relative right-1.5 h-3.5 w-3.5 font-bold" /> Add
                </>
              )}
            </button>
          </div>
        </div>

        <div className="personal-information m-4 flex justify-between rounded-xl border border-gray-300">
          <div className="m-4">
            <h2 className="m-3 text-xl font-semibold">Personal Information</h2>
            {profileComplete ? (
              <>
                <div className="mx-4 grid grid-cols-2 gap-16 space-y-1.5">
                  <div className="flex flex-col space-y-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">First name</span>
                      <span>{profile?.firstname}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Gender</span>
                      <span>{genderLabel(profile?.gender)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Age</span>
                      <span>{profile?.age ?? '—'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Last name</span>
                      <span>{profile?.lastname}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Phone</span>
                      <span>{profile?.phone_number ?? profile?.phone ?? '—'}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="mx-4 text-sm text-gray-500">No personal information added yet.</p>
            )}
          </div>
        </div>

        <div className="address m-4 rounded-xl border border-gray-300">
          <div className="m-4">
            <h2 className="m-3 text-xl font-semibold">Address</h2>
            {profile?.address?.city ? (
              <div className="mx-4 grid grid-cols-2 gap-16">
                <div className="flex flex-col space-y-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Street</span>
                    <span>{profile.address.street ?? '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">City</span>
                    <span>{profile.address.city ?? '—'}</span>
                  </div>
                </div>
                <div className="flex flex-col space-y-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Barangay</span>
                    <span>{profile.address.barangay ?? '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Province</span>
                    <span>{profile.address.province ?? '—'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mx-4 text-sm text-gray-500">No address added yet.</p>
            )}
          </div>
        </div>
      </main>

      <ProfileFormModal
        open={modalOpen}
        title={profileComplete ? 'Edit profile' : 'Add profile information'}
        onClose={() => setModalOpen(false)}
        form={profileForm.form}
        onSubmit={profileForm.onSubmit}
        saving={profileForm.saving}
        isDirector={profileForm.isDirector}
        avatarPreview={profileForm.avatarPreview}
        signaturePreview={profileForm.signaturePreview}
        showRemoteAvatar={profileForm.showRemoteAvatar}
        showRemoteSignature={profileForm.showRemoteSignature}
        avatarError={profileForm.avatarError}
        signatureError={profileForm.signatureError}
        onAvatarChange={profileForm.setAvatar}
        onSignatureChange={profileForm.setSignature}
      />
    </div>
  )
}
