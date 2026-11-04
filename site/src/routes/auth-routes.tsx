import type { RouteObject } from 'react-router-dom'
import { LOGIN_PATH } from '../config/auth-redirect'
import { REQUEST_ACCESS_PATH } from '../constants/routes'

/** Sign-in and request-access open as modals over the landing page. These paths sit
 *  under the Home route (see public-routes) and render nothing themselves; Home's
 *  AuthModalHost reads the path and opens the matching modal. */
export const authRoutes: RouteObject[] = [
  { path: LOGIN_PATH, element: null },
  { path: REQUEST_ACCESS_PATH, element: null },
]
