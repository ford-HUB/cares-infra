import { Outlet } from 'react-router-dom'
import { useRouteSeo } from '../hooks/use-route-seo'

/** Pathless root route: applies each route's head tags, then renders the route. */
export function SeoRoot() {
  useRouteSeo()
  return <Outlet />
}
