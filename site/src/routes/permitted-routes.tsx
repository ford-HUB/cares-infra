import type { RouteObject } from 'react-router-dom'
import { directorRoutes } from './director-routes'
import { staffRoutes } from './staff-routes'

/** RBAC-protected portal routes — director and staff/coordinator dashboards. */
export const permittedRoutes: RouteObject[] = [
  ...directorRoutes,
  ...staffRoutes,
]
