import { X } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { ImageUploadField } from './ui/image-upload-field'
import type { DirectorProfileFormValues, ProfileFormValues } from '../../validators/profile-schema'

interface ProfileFormModalProps {
  open: boolean
  title: string
  form: UseFormReturn<ProfileFormValues | DirectorProfileFormValues>
  onSubmit: () => void
  onClose: () => void
  saving: boolean
  isDirector: boolean
  avatarPreview: string | null
  signaturePreview: string | null
  showRemoteAvatar: boolean
  showRemoteSignature: boolean
  avatarError: string | null
  signatureError: string | null
  onAvatarChange: (file: File | null) => void
  onSignatureChange: (file: File | null) => void
}

export function ProfileFormModal({
  open,
  title,
  form,
  onSubmit,
  onClose,
  saving,
  isDirector,
  avatarPreview,
  signaturePreview,
  showRemoteAvatar,
  showRemoteSignature,
  avatarError,
  signatureError,
  onAvatarChange,
  onSignatureChange,
}: ProfileFormModalProps) {
  const {
    register,
    formState: { errors },
  } = form

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-form-title"
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 id="profile-form-title" className="text-lg font-bold text-gray-800">
              {title}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Complete your portal profile. Images are stored securely in AWS S3.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ImageUploadField
                id="profile-avatar"
                label="Profile photo"
                hint="JPG, PNG, or WebP. Max 5 MB."
                localPreviewUrl={avatarPreview}
                remoteAsset={showRemoteAvatar ? 'avatar' : null}
                error={avatarError}
                onChange={onAvatarChange}
                variant="avatar"
              />
              {isDirector && (
                <ImageUploadField
                  id="profile-signature"
                  label="Director signature"
                  hint="Transparent PNG recommended. Max 2 MB."
                  localPreviewUrl={signaturePreview}
                  remoteAsset={showRemoteSignature ? 'signature' : null}
                  error={signatureError}
                  onChange={onSignatureChange}
                  variant="signature"
                />
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="firstname" className="mb-0.5 block text-xs font-medium text-gray-700">
                  First name
                </label>
                <input
                  id="firstname"
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
                  {...register('firstname')}
                />
                {errors.firstname && (
                  <p className="mt-0.5 text-[10px] text-red-600">{errors.firstname.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="lastname" className="mb-0.5 block text-xs font-medium text-gray-700">
                  Last name
                </label>
                <input
                  id="lastname"
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
                  {...register('lastname')}
                />
                {errors.lastname && (
                  <p className="mt-0.5 text-[10px] text-red-600">{errors.lastname.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="phone_number" className="mb-0.5 block text-xs font-medium text-gray-700">
                  Phone number
                </label>
                <input
                  id="phone_number"
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
                  {...register('phone_number')}
                />
                {errors.phone_number && (
                  <p className="mt-0.5 text-[10px] text-red-600">{errors.phone_number.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="gender" className="mb-0.5 block text-xs font-medium text-gray-700">
                  Gender
                </label>
                <select
                  id="gender"
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
                  {...register('gender')}
                >
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                </select>
              </div>
            </div>

            {!isDirector && (
              <div>
                <label htmlFor="department" className="mb-0.5 block text-xs font-medium text-gray-700">
                  Department / office
                </label>
                <input
                  id="department"
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
                  {...form.register('department' as keyof ProfileFormValues)}
                />
                {'department' in errors && errors.department && (
                  <p className="mt-0.5 text-[10px] text-red-600">{errors.department.message}</p>
                )}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="address_street" className="mb-0.5 block text-xs font-medium text-gray-700">
                  Street
                </label>
                <input
                  id="address_street"
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
                  {...register('address_street')}
                />
                {errors.address_street && (
                  <p className="mt-0.5 text-[10px] text-red-600">{errors.address_street.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="address_barangay" className="mb-0.5 block text-xs font-medium text-gray-700">
                  Barangay
                </label>
                <input
                  id="address_barangay"
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
                  {...register('address_barangay')}
                />
                {errors.address_barangay && (
                  <p className="mt-0.5 text-[10px] text-red-600">{errors.address_barangay.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="address_city" className="mb-0.5 block text-xs font-medium text-gray-700">
                  City
                </label>
                <input
                  id="address_city"
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
                  {...register('address_city')}
                />
                {errors.address_city && (
                  <p className="mt-0.5 text-[10px] text-red-600">{errors.address_city.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="address_province" className="mb-0.5 block text-xs font-medium text-gray-700">
                  Province
                </label>
                <input
                  id="address_province"
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
                  {...register('address_province')}
                />
                {errors.address_province && (
                  <p className="mt-0.5 text-[10px] text-red-600">{errors.address_province.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--cares-primary-hover)] disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
