import { Construction } from 'lucide-react'
import { ContentShell } from './content-shell'
import { InlinePageHeader } from './page-chrome'

interface PlaceholderPageProps {
  title: string
  description?: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <ContentShell>
      <InlinePageHeader
        title={title}
        description={
          description ??
          'This page is migrated into the portal shell. Backend wiring is deferred; connect services when the API is ready.'
        }
      />
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
        <Construction className="mx-auto h-10 w-10 text-gray-400" />
        <p className="mt-4 text-sm text-gray-500">
          Frontend route is registered. UI modules from the legacy Capstone app can be
          connected here via stores and services.
        </p>
      </div>
    </ContentShell>
  )
}
