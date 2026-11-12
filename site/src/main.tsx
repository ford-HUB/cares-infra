import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { mainRouter as router } from './routes/main-router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    {/* Painted from the palette so toasts follow the portal's dark mode too. */}
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: 'var(--cares-card)',
          color: 'var(--cares-heading)',
          border: '1px solid var(--cares-border)',
        },
      }}
    />
  </StrictMode>,
)
