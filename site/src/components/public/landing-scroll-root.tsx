import { Outlet, ScrollRestoration } from 'react-router-dom'

/** Above the layout, so it stays mounted during a full-screen bulletin page and Back restores position. */
export function LandingScrollRoot() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  )
}
