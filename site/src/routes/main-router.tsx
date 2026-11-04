import { createBrowserRouter } from 'react-router-dom'
import { permittedRoutes } from './permitted-routes'
import { publicRoutes } from './public-routes'

export const mainRouter = createBrowserRouter([
  ...publicRoutes,
  ...permittedRoutes,
])