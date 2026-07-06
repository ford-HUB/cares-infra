import type { RouteObject } from 'react-router-dom'
import { LOGIN_PATH } from '../config/auth-redirect'
import { REQUEST_ACCESS_PATH } from '../constants/routes'
import { Login } from '../pages/auth/Login'
import { RequestAccess } from '../pages/auth/RequestAccess'

export const authRoutes: RouteObject[] = [
  { path: LOGIN_PATH, element: <Login /> },
  { path: REQUEST_ACCESS_PATH, element: <RequestAccess /> },
]
