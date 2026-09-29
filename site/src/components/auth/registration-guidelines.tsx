import { ShieldCheck } from 'lucide-react'
import { REGISTRATION_GUIDELINES } from '../../constants/request-access'
import { MessageFormatCollapsible } from './ui/message-format-collapsible'

export function RegistrationGuidelines() {
  return (
    <aside className="absolute top-0 left-full ml-4 hidden w-52 flex-col gap-3 lg:flex">
      <div className="rounded-lg border border-[var(--cares-border)] bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--cares-primary)]" />
          <h2 className="text-xs font-semibold text-[var(--cares-heading)]">
            Registration guidelines
          </h2>
        </div>

        <ul className="space-y-1.5 text-[11px] leading-snug text-[var(--cares-body)]">
          {REGISTRATION_GUIDELINES.map((line) => (
            <li key={line} className="flex gap-1.5">
              <span className="shrink-0 text-[var(--cares-primary)]">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <MessageFormatCollapsible />
    </aside>
  )
}
