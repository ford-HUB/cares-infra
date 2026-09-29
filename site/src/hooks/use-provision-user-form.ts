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
  provisionUserDefaultValues,
  provisionUserSchema,
  type ProvisionUserFormValues,
} from '../validators/provision-user-schema'

/**
 * Where the recipient address stands with the server. `idle` means nothing has been
 * checked for the current value; the other states always refer to `email`, so a later
 * edit to the field invalidates them.
 */
export type RecipientEmailCheck =
  | { status: 'idle' }
  | { status: 'checking'; email: string }
  | { status: 'valid'; email: string }
  | { status: 'invalid'; email: string; message: string }

const IDLE_CHECK: RecipientEmailCheck = { status: 'idle' }

/**
 * Owns the add-user dialog: the form, the scope selection layered on top of the role
 * baseline, the pre-check on the inbox the credentials are mailed to, and the credential
 * the server hands back once. The scope starts as the role's own rights and is only sent
 * when the administrator actually changed it — an untouched account stays on the
 * baseline, so a later baseline change still reaches it.
 */
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
  const recipientEmail = form.watch('recipientEmail')

  useEffect(() => {
    void fetchCatalog()
  }, [fetchCatalog])

  // A verdict is about one exact value — typing anything else puts the field back to
  // unchecked rather than leaving a stale tick next to a different address.
  useEffect(() => {
    if (recipientCheck.status === 'idle') return
    if (recipientCheck.email !== recipientEmail.trim().toLowerCase()) {
      setRecipientCheck(IDLE_CHECK)
    }
  }, [recipientEmail, recipientCheck])

  /**
   * Runs when the recipient field loses focus. The shape is checked locally so an
   * obvious typo never costs a round trip; anything well-formed goes to the server,
   * which also confirms the domain accepts mail and that no account already uses it.
   */
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
    const entry = catalog?.roles.find((item) => item.role === role.toLowerCase())
    return entry?.permissions ?? []
  }, [catalog, role])

  // A different role means a different baseline, so an untouched selection follows it.
  // A customised one is left alone rather than silently discarding the choices made.
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
    // The blur check may not have run (Enter straight from the field) or may have been
    // invalidated by an edit — the server gate is the same one, so run it here too.
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

    const result = await provisionUser({
      mode: values.mode,
      ...(values.mode === 'manual' ? { email: values.email } : {}),
      recipientEmail: verdict.email,
      role: values.role,
      department: values.department || undefined,
      permissions: scopeCustomised ? [...selected] : undefined,
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
