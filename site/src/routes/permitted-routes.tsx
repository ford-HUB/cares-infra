import type { RouteObject } from 'react-router-dom'
import { adminRoutes } from './admin-routes'

export const permittedRoutes: RouteObject[] = [...adminRoutes]
