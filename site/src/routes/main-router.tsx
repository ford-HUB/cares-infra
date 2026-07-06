import { createBrowserRouter } from 'react-router-dom'
import { authRoutes } from './auth-routes'
import { permittedRoutes } from './permitted-routes'
import { publicRoutes } from './public-routes'

export const mainRouter = createBrowserRouter([
  ...publicRoutes,
  ...authRoutes,
  ...permittedRoutes,
])