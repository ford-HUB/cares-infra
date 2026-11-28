import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { checkProvisionEmail } from '../services/manage-user-service'
import { useAccessControlStore } from '../store/access-control-store'
import { useManageUsersStore } from '../store/manage-users-store'
import type { CredentialDelivery, IssuedCredentials } from '../types/manage-users'
import type { PermissionKey } from '../types/access-control'
import {
  isPartnerBarangayVolunteer,
  provisionUserDefaultValues,
  provisionUserSchema,
  resolveProvisionRole,
  type ProvisionUserFormValues,
} from '../validators/provision-user-schema'

/** Non-idle states refer to `email`; editing the field invalidates them. */
export type RecipientEmailCheck =
  | { status: 'idle' }
  | { status: 'checking'; email: string }
  | { status: 'valid'; email: string }
  | { status: 'invalid'; email: string; message: string }

const IDLE_CHECK: RecipientEmailCheck = { status: 'idle' }

/** Scope is sent only if changed, so untouched accounts keep following the role baseline. */
export function useProvisionUserForm(onCreated?: () => void) {
  const provisionUser = useManageUsersStore((state) => state.provisionUser)
  const catalog = useAccessControlStore((state) => state.catalog)
  const catalogLoading = useAccessControlStore((state) => state.catalogLoading)
  const fetchCatalog = useAccessControlStore((state) => state.fetchCatalog)

  const [selected, setSelected] = useState<Set<PermissionKey>>(new Set())
  const [scopeCustomised, setScopeCustomised] = useState(false)
  const [credentials, setCredentials] = useState<IssuedCredentials | null>(null)
  const [delivery, setDelivery] = useState<CredentialDelivery | null>(null)
  const [recipientCheck, setRecipientCheck] = useState<RecipientEmailCheck>(IDLE_CHECK)

  const form = useForm<ProvisionUserFormValues>({
    resolver: zodResolver(provisionUserSchema),
    defaultValues: provisionUserDefaultValues,
  })

  const mode = form.watch('mode')
  const role = form.watch('role')
  const regularUserType = form.watch('regularUserType')
  const recipientEmail = form.watch('recipientEmail')
  const resolvedRole = resolveProvisionRole({ role, regularUserType })
  const { roleType, isPortalRole } = resolvedRole
  const isPartnerBarangay = isPartnerBarangayVolunteer({ role, regularUserType })

  useEffect(() => {
    void fetchCatalog()
  }, [fetchCatalog])

  useEffect(() => {
    if (recipientCheck.status === 'idle') return
    if (recipientCheck.email !== recipientEmail.trim().toLowerCase()) {
      setRecipientCheck(IDLE_CHECK)
    }
  }, [recipientEmail, recipientCheck])

  /** Shape checked locally; the server confirms the domain accepts mail and the address is unused. */
  const checkRecipientEmail = useCallback(async (): Promise<RecipientEmailCheck> => {
    const email = form.getValues('recipientEmail').trim().toLowerCase()
    if (!email) {
      setRecipientCheck(IDLE_CHECK)
      return IDLE_CHECK
    }

    if (!z.string().email().safeParse(email).success) {
      const verdict: RecipientEmailCheck = {
        status: 'invalid',
        email,
        message: 'Enter a valid email address',
      }
      setRecipientCheck(verdict)
      return verdict
    }

    setRecipientCheck({ status: 'checking', email })
    const result = await checkProvisionEmail(email)

    let verdict: RecipientEmailCheck
    if (!result.success || !result.check) {
      verdict = {
        status: 'invalid',
        email,
        message: result.message ?? 'The address could not be checked — try again',
      }
    } else if (result.check.valid) {
      verdict = { status: 'valid', email }
    } else {
      verdict = {
        status: 'invalid',
        email,
        message: result.check.reason ?? 'That email address cannot be used',
      }
    }

    setRecipientCheck(verdict)
    return verdict
  }, [form])

  const baseline = useMemo(() => {
    const entry = catalog?.roles.find((item) => item.role === roleType.toLowerCase())
    return entry?.permissions ?? []
  }, [catalog, roleType])

  // Untouched selections follow the new role baseline; customised ones are kept.
  useEffect(() => {
    if (scopeCustomised) return
    setSelected(new Set(baseline))
  }, [baseline, scopeCustomised])

  const togglePermissions = useCallback((permissions: PermissionKey[], next: boolean) => {
    setScopeCustomised(true)
    setSelected((current) => {
      const updated = new Set(current)
      for (const permission of permissions) {
        if (next) {
          updated.add(permission)
        } else {
          updated.delete(permission)
        }
      }
      return updated
    })
  }, [])

  const togglePermission = useCallback(
    (permission: PermissionKey, next: boolean) => togglePermissions([permission], next),
    [togglePermissions],
  )

  const resetScope = useCallback(() => {
    setScopeCustomised(false)
    setSelected(new Set(baseline))
  }, [baseline])

  const reset = useCallback(() => {
    form.reset(provisionUserDefaultValues)
    setScopeCustomised(false)
    setCredentials(null)
    setDelivery(null)
    setRecipientCheck(IDLE_CHECK)
  }, [form])

  const onSubmit = form.handleSubmit(async (values) => {
    // Blur check may not have run or may be stale.
    const verdict =
      recipientCheck.status === 'valid' ? recipientCheck : await checkRecipientEmail()

    if (verdict.status !== 'valid') {
      form.setError('recipientEmail', {
        type: 'server',
        message:
          verdict.status === 'invalid'
            ? verdict.message
            : 'Enter the email address to send the credentials to',
      })
      return
    }

    const submitted = resolveProvisionRole(values)
    const partnerBarangay = isPartnerBarangayVolunteer(values)
    const result = await provisionUser({
      mode: values.mode,
      ...(values.mode === 'manual' ? { email: values.email } : {}),
      recipientEmail: verdict.email,
      role: submitted.roleType,
      volunteerType: submitted.volunteerType ?? undefined,
      // Donors/beneficiaries have no department; partner-barangay volunteers use their barangay.
      department:
        !partnerBarangay && (submitted.isPortalRole || submitted.volunteerType)
          ? values.department || undefined
          : undefined,
      partnerBarangay: partnerBarangay ? values.partnerBarangay || undefined : undefined,
      permissions: submitted.isPortalRole && scopeCustomised ? [...selected] : undefined,
      expiresInHours: values.expiresInHours,
    })

    if (!result.ok || !result.credentials) {
      toast.error(result.message ?? 'The account could not be created')
      return
    }

    setCredentials(result.credentials)
    setDelivery(result.delivery ?? null)

    if (result.delivery?.sent) {
      toast.success(`Account created — credentials sent to ${result.delivery.recipient}`)
    } else {
      toast.success('Account created')
    }
    onCreated?.()
  })

  return {
    form,
    mode,
    isRegularUser: !isPortalRole,
    showDepartment:
      !isPartnerBarangay && (isPortalRole || resolvedRole.volunteerType !== null),
    showPartnerBarangay: isPartnerBarangay,
    onSubmit,
    submitting: form.formState.isSubmitting,
    catalog,
    catalogLoading,
    baseline,
    selected,
    scopeCustomised,
    togglePermission,
    togglePermissions,
    resetScope,
    recipientCheck,
    checkRecipientEmail,
    credentials,
    delivery,
    reset,
  }
}
