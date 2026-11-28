import { Outlet } from 'react-router-dom'
import { useRouteSeo } from '../hooks/use-route-seo'

/** Pathless root route: applies each route's head tags. */
export function SeoRoot() {
  useRouteSeo()
  return <Outlet />
}
