import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useProfileStore } from '../store/profile-store'
import type { ProfileInfo } from '../types/profile'
import { validateProfileImage } from '../utils/profile-upload-files'
import { mapGenderToForm } from '../utils/profile-helpers'
import {
  directorProfileFormDefaultValues,
  getProfileFormSchema,
  profileFormDefaultValues,
  type DirectorProfileFormValues,
  type ProfileFormValues,
} from '../validators/profile-schema'

interface UseProfileFormOptions {
  profile: ProfileInfo | null
  isDirector: boolean
  onSuccess: () => void
}

export function useProfileForm({ profile, isDirector, onSuccess }: UseProfileFormOptions) {
  const savePortalProfile = useProfileStore((s) => s.savePortalProfile)
  const saving = useProfileStore((s) => s.saving)
  const schema = useMemo(() => getProfileFormSchema(isDirector), [isDirector])

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [signatureError, setSignatureError] = useState<string | null>(null)
  const avatarObjectUrlRef = useRef<string | null>(null)
  const signatureObjectUrlRef = useRef<string | null>(null)

  const form = useForm<ProfileFormValues | DirectorProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: isDirector ? directorProfileFormDefaultValues : profileFormDefaultValues,
  })

  useEffect(() => {
    if (!profile) {
      form.reset(isDirector ? directorProfileFormDefaultValues : profileFormDefaultValues)
      return
    }

    const baseValues = {
      firstname: profile.firstname ?? '',
      lastname: profile.lastname ?? '',
      phone_number: profile.phone_number ?? profile.phone ?? '',
      gender: mapGenderToForm(profile.gender),
      address_street: profile.address?.street ?? '',
      address_barangay: profile.address?.barangay ?? '',
      address_city: profile.address?.city ?? '',
      address_province: profile.address?.province ?? '',
    }

    form.reset(
      isDirector
        ? baseValues
        : { ...baseValues, department: profile.department ?? '' },
    )

    if (!avatarFile) {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current)
        avatarObjectUrlRef.current = null
      }
      setAvatarPreview(null)
    }

    if (!signatureFile) {
      if (signatureObjectUrlRef.current) {
        URL.revokeObjectURL(signatureObjectUrlRef.current)
        signatureObjectUrlRef.current = null
      }
      setSignaturePreview(null)
    }

    setAvatarError(null)
    setSignatureError(null)
  }, [avatarFile, form, isDirector, profile, signatureFile])

  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current)
      if (signatureObjectUrlRef.current) URL.revokeObjectURL(signatureObjectUrlRef.current)
    }
  }, [])

  const setAvatar = (file: File | null) => {
    if (!file) {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current)
        avatarObjectUrlRef.current = null
      }
      setAvatarFile(null)
      setAvatarPreview(null)
      setAvatarError(null)
      return
    }

    const validation = validateProfileImage(file, 'avatar')
    if (!validation.valid) {
      setAvatarError(validation.message ?? 'Invalid file')
      return
    }

    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current)
    }

    const objectUrl = URL.createObjectURL(file)
    avatarObjectUrlRef.current = objectUrl
    setAvatarError(null)
    setAvatarFile(file)
    setAvatarPreview(objectUrl)
  }

  const setSignature = (file: File | null) => {
    if (!file) {
      if (signatureObjectUrlRef.current) {
        URL.revokeObjectURL(signatureObjectUrlRef.current)
        signatureObjectUrlRef.current = null
      }
      setSignatureFile(null)
      setSignaturePreview(null)
      setSignatureError(null)
      return
    }

    const validation = validateProfileImage(file, 'signature')
    if (!validation.valid) {
      setSignatureError(validation.message ?? 'Invalid file')
      return
    }

    if (signatureObjectUrlRef.current) {
      URL.revokeObjectURL(signatureObjectUrlRef.current)
    }

    const objectUrl = URL.createObjectURL(file)
    signatureObjectUrlRef.current = objectUrl
    setSignatureError(null)
    setSignatureFile(file)
    setSignaturePreview(objectUrl)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const needsAvatar = !profile?.hasProfileImage && !avatarFile
    if (needsAvatar) {
      setAvatarError('Profile photo is required')
      return
    }

    const needsSignature = isDirector && !profile?.hasSignature && !signatureFile
    if (needsSignature) {
      setSignatureError('Director signature is required')
      return
    }

    const ok = await savePortalProfile({
      ...values,
      department: isDirector ? undefined : (values as ProfileFormValues).department,
      avatar: avatarFile,
      signature: signatureFile,
    })

    if (ok) {
      toast.success('Profile saved')
      onSuccess()
      return
    }

    toast.error('Failed to save profile')
  })

  const showRemoteAvatar = Boolean(profile?.hasProfileImage) && !avatarFile
  const showRemoteSignature = Boolean(profile?.hasSignature) && !signatureFile

  return {
    form,
    onSubmit,
    saving,
    avatarPreview,
    signaturePreview,
    showRemoteAvatar,
    showRemoteSignature,
    avatarError,
    signatureError,
    setAvatar,
    setSignature,
    isDirector,
  }
}
