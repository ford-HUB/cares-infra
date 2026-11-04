import { Outlet, ScrollRestoration } from 'react-router-dom'

/** Holds scroll restoration above the layout, so it stays mounted during a full-screen
 *  bulletin page and Back returns to the same spot on the long public page. */
export function LandingScrollRoot() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  )
}
