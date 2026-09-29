interface NavSectionLabelProps {
  label: string
  collapsed: boolean
  /** First section in the list — skips the top spacing so it hugs the header. */
  first: boolean
}

export function NavSectionLabel({ label, collapsed, first }: NavSectionLabelProps) {
  if (collapsed) {
    return (
      <div
        role="separator"
        aria-label={label}
        className={`mx-auto h-px w-6 bg-white/15 ${first ? 'mb-2' : 'my-3'}`}
      />
    )
  }

  return (
    <p
      className={`px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-white/40 uppercase ${
        first ? '' : 'pt-4'
      }`}
    >
      {label}
    </p>
  )
}
