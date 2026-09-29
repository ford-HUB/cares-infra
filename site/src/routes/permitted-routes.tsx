import type { RouteObject } from 'react-router-dom'
import { adminRoutes } from './admin-routes'

/** RBAC-protected portal routes — one admin UI shared by admin, director and coordinator. */
export const permittedRoutes: RouteObject[] = [...adminRoutes]
