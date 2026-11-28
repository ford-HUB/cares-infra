import type { ReactNode } from 'react'

interface LandingSectionProps {
  id: string
  children: ReactNode
}

/** The scroll margin clears the sticky header, which gains a second link row below md. */
export function LandingSection({ id, children }: LandingSectionProps) {
  return (
    <section id={id} className="scroll-mt-26 md:scroll-mt-14">
      {children}
    </section>
  )
}
