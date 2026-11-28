import type { LegalBlock, LegalListItem, LegalSection } from '../../../../types/legal'

function ListItem({ item }: { item: LegalListItem }) {
  if (typeof item === 'string') return <li>{item}</li>
  return (
    <li>
      <span className="font-semibold text-[var(--cares-heading)]">{item.term}</span>
      {' — '}
      {item.text}
    </li>
  )
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') return <p>{block}</p>
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-[var(--cares-primary-hover)]">
      {block.items.map((item) => (
        <ListItem key={typeof item === 'string' ? item : item.term} item={item} />
      ))}
    </ul>
  )
}

/** `scroll-mt` clears the sticky header on TOC and deep-link jumps. */
export function LegalSectionBody({ section, number }: { section: LegalSection; number: number }) {
  return (
    <section id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-24">
      <h2
        id={`${section.id}-title`}
        className="flex items-baseline gap-3 text-[17px] font-bold text-[var(--cares-heading)] sm:text-lg"
      >
        <span className="text-[13px] font-semibold text-[var(--cares-primary-hover)] tabular-nums">
          {String(number).padStart(2, '0')}
        </span>
        {section.title}
      </h2>
      <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-[var(--cares-body)] sm:text-[15px]">
        {section.blocks.map((block, index) => (
          <Block key={index} block={block} />
        ))}
      </div>
    </section>
  )
}
