import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAccessControlStore } from '../store/access-control-store'
import { useManageUsersStore } from '../store/manage-users-store'
import type { IssuedCredentials } from '../types/manage-users'
import type { PermissionKey } from '../types/access-control'
import {
  provisionUserDefaultValues,
  provisionUserSchema,
  type ProvisionUserFormValues,
} from '../validators/provision-user-schema'

/**
 * Owns the add-user dialog: the form, the scope selection layered on top of the role
 * baseline, and the credential the server hands back once. The scope starts as the
 * role's own rights and is only sent when the administrator actually changed it — an
 * untouched account stays on the baseline, so a later baseline change still reaches it.
 */
export function useProvisionUserForm(onCreated?: () => void) {
  const provisionUser = useManageUsersStore((state) => state.provisionUser)
  const catalog = useAccessControlStore((state) => state.catalog)
  const catalogLoading = useAccessControlStore((state) => state.catalogLoading)
  const fetchCatalog = useAccessControlStore((state) => state.fetchCatalog)

  const [selected, setSelected] = useState<Set<PermissionKey>>(new Set())
  const [scopeCustomised, setScopeCustomised] = useState(false)
  const [credentials, setCredentials] = useState<IssuedCredentials | null>(null)

  const form = useForm<ProvisionUserFormValues>({
    resolver: zodResolver(provisionUserSchema),
    defaultValues: provisionUserDefaultValues,
  })

  const mode = form.watch('mode')
  const role = form.watch('role')

  useEffect(() => {
    void fetchCatalog()
  }, [fetchCatalog])

  const baseline = useMemo(() => {
    const entry = catalog?.roles.find((item) => item.role === role.toLowerCase())
    return entry?.permissions ?? []
  }, [catalog, role])

  // A different role means a different baseline, so an untouched selection follows it.
  // A customised one is left alone rather than silently discarding the choices made.
  useEffect(() => {
    if (scopeCustomised) return
    setSelected(new Set(baseline))
  }, [baseline, scopeCustomised])

  const togglePermission = useCallback((permission: PermissionKey, next: boolean) => {
    setScopeCustomised(true)
    setSelected((current) => {
      const updated = new Set(current)
      if (next) {
        updated.add(permission)
      } else {
        updated.delete(permission)
      }
      return updated
    })
  }, [])

  const resetScope = useCallback(() => {
    setScopeCustomised(false)
    setSelected(new Set(baseline))
  }, [baseline])

  const reset = useCallback(() => {
    form.reset(provisionUserDefaultValues)
    setScopeCustomised(false)
    setCredentials(null)
  }, [form])

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await provisionUser({
      mode: values.mode,
      firstName: values.firstName,
      lastName: values.lastName,
      ...(values.mode === 'manual' ? { email: values.email } : {}),
      role: values.role,
      department: values.department || undefined,
      phoneNumber: values.phoneNumber || undefined,
      permissions: scopeCustomised ? [...selected] : undefined,
      expiresInHours: values.expiresInHours,
    })

    if (!result.ok || !result.credentials) {
      toast.error(result.message ?? 'The account could not be created')
      return
    }

    setCredentials(result.credentials)
    toast.success(`Account created for ${values.firstName} ${values.lastName}`)
    onCreated?.()
  })

  return {
    form,
    mode,
    onSubmit,
    submitting: form.formState.isSubmitting,
    catalog,
    catalogLoading,
    baseline,
    selected,
    scopeCustomised,
    togglePermission,
    resetScope,
    credentials,
    reset,
  }
}
