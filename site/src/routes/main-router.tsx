import { createBrowserRouter } from 'react-router-dom'
import { SeoRoot } from '../components/seo-root'
import { permittedRoutes } from './permitted-routes'
import { publicRoutes } from './public-routes'

export const mainRouter = createBrowserRouter([
  {
    // Pathless: only keeps head tags current.
    element: <SeoRoot />,
    children: [...publicRoutes, ...permittedRoutes],
  },
])
