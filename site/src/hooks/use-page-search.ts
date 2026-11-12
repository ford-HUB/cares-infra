import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { readPortalFind } from '../utils/portal-find'

/**
 * A module's own search box, pre-filled when the header search opened the module
 * for a record ("bea" → Manage Users filtered to "bea", so the person is on the
 * first page rather than page 3). Use it in place of `useState('')`.
 *
 * Only the initial value is read: the portal layout remounts the screen for every
 * new header search (it keys the outlet on the search), so a second search for the
 * same module still lands.
 */
export function usePageSearch() {
  const location = useLocation()
  return useState(() => readPortalFind(location.state)?.term ?? '')
}
