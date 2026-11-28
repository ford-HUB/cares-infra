import { ArrowRight, ChevronDown } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  LANDING_ACTIVE_SECTION_ROOT_MARGIN,
  LANDING_BANNER_SERIF,
  LANDING_CONTAINER,
} from '../../../constants/landing-bulletin'
import { useActiveSection } from '../../../hooks/use-active-section'
import type { LegalDocument } from '../../../types/legal'
import { LegalSectionBody } from './ui/legal-section-body'
import { LegalToc } from './ui/legal-toc'

interface LegalDocumentViewProps {
  document: LegalDocument
  related: { label: string; to: string }
}

export function LegalDocumentView({ document, related }: LegalDocumentViewProps) {
  const sectionIds = useMemo(() => document.sections.map((s) => s.id), [document])
  const activeId = useActiveSection(sectionIds, LANDING_ACTIVE_SECTION_ROOT_MARGIN)

  return (
    <article>
      <header className="bg-[var(--cares-primary)] bg-[radial-gradient(ellipse_at_70%_0%,rgb(34_120_70/0.45),transparent_60%)] text-white">
        <div className={`${LANDING_CONTAINER} py-12 sm:py-16`}>
          <p className="text-[12px] font-semibold tracking-[0.14em] text-white/70 uppercase">
            Legal
          </p>
          <h1 className={`${LANDING_BANNER_SERIF} mt-2 text-3xl font-bold sm:text-4xl`}>
            {document.title}
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-white/85 sm:text-[15px]">
            {document.summary}
          </p>
          <p className="mt-5 text-[13px] text-white/70">
            Effective <time className="font-semibold text-white">{document.effectiveDate}</time>
          </p>
        </div>
      </header>

      <div className={`${LANDING_CONTAINER} grid gap-8 py-10 sm:py-14 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14`}>
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <details className="group rounded-xl bg-[var(--cares-about-bg)] p-2 ring-1 ring-black/5 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[13px] font-semibold text-[var(--cares-heading)]">
              On this page
              <ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <nav aria-label="On this page" className="mt-1">
              <LegalToc sections={document.sections} activeId={activeId} />
            </nav>
          </details>
          <nav aria-label="On this page" className="hidden lg:block">
            <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.12em] text-[var(--cares-muted)] uppercase">
              On this page
            </p>
            <LegalToc sections={document.sections} activeId={activeId} />
          </nav>
        </aside>

        <div className="min-w-0 max-w-3xl">
          <div className="space-y-10 rounded-2xl bg-white p-6 shadow-[0_6px_24px_rgba(27,67,50,0.08)] ring-1 ring-black/5 sm:p-10">
            {document.sections.map((section, index) => (
              <LegalSectionBody key={section.id} section={section} number={index + 1} />
            ))}
          </div>

          <Link
            to={related.to}
            className="group mt-6 flex items-center justify-between rounded-xl bg-white px-6 py-4 text-[14px] font-semibold text-[var(--cares-primary)] ring-1 ring-black/5 transition-colors hover:bg-[var(--cares-about-bg)] focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
          >
            {related.label}
            <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  )
}
