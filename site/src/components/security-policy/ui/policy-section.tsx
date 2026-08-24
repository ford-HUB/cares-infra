import type { ReactNode } from 'react'

interface PolicySectionProps {
  title: string
  description: string
  children: ReactNode
}

/** One card per group of rules, so the form reads as four decisions rather than sixteen. */
export function PolicySection({ title, description, children }: PolicySectionProps) {
  return (
    <section className="rounded-xl border border-gray-300 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}
