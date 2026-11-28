import type { RouteObject } from 'react-router-dom'
import { LOGIN_PATH } from '../config/auth-redirect'
import { REQUEST_ACCESS_PATH } from '../constants/routes'

/** Render nothing; Home's AuthModalHost opens the modal for these paths. */
export const authRoutes: RouteObject[] = [
  { path: LOGIN_PATH, element: null },
  { path: REQUEST_ACCESS_PATH, element: null },
]
