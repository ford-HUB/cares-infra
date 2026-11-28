import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { readPortalFind } from '../utils/portal-find'

/** Only the initial value is read; the layout remounts the screen per header search. */
export function usePageSearch() {
  const location = useLocation()
  return useState(() => readPortalFind(location.state)?.term ?? '')
}
