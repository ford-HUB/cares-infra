import { cn } from '@/lib/utils'
import { useReveal } from '../../../hooks/use-reveal'
import {
  LANDING_BANNER_SERIF,
  LANDING_DISPLAY,
  LANDING_SLAB,
} from '../../../constants/landing-bulletin'
import {
  landingHighlightStoryId,
  type LandingHighlightStory as Story,
} from '../../../constants/landing-highlights'

const PHOTO_ZOOM =
  'motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-105'

/** Award slides keep their own shape so none of their text is cut. */
function LandingHighlightPhoto({ story }: { story: Story }) {
  const contain = story.fit === 'contain'

  return (
    <div
      className={cn(
        'group w-full overflow-hidden rounded-md bg-[var(--cares-about-sage)] shadow-sm',
        !contain && 'aspect-[4/3]',
      )}
    >
      <img
        src={story.image}
        alt={story.imageAlt}
        loading="lazy"
        className={cn(
          PHOTO_ZOOM,
          contain ? 'block h-auto w-full' : 'h-full w-full object-cover',
          story.focus === 'top' && 'object-top',
        )}
      />
    </div>
  )
}

function LandingHighlightTag({ label, lead }: { label: string; lead: boolean }) {
  const { ref, visible } = useReveal<HTMLSpanElement>(0.6)

  return (
    <div className="relative z-10 -mt-3 flex">
      <span
        ref={ref}
        className={`${LANDING_DISPLAY} ${cn(
          'group/tag relative isolate overflow-hidden rounded-full bg-[var(--cares-primary)] px-3 py-1.5 leading-none font-semibold tracking-[0.08em] text-white uppercase shadow-md',
          'transition-[translate,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg',
          lead ? 'text-[11px]' : 'text-[10px]',
          visible ? 'motion-safe:animate-landing-pill-in' : 'motion-safe:opacity-0',
        )}`}
      >
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0 -left-1/2 -z-10 w-1/2 -skew-x-[20deg] bg-gradient-to-r from-transparent via-white/30 to-transparent motion-safe:group-hover/tag:translate-x-[400%] motion-safe:group-hover/tag:transition-transform motion-safe:group-hover/tag:duration-700 motion-safe:group-hover/tag:ease-out',
            visible && 'motion-safe:animate-landing-pill-sweep',
          )}
        />
        <span
          className={cn(
            'relative',
            visible ? 'motion-safe:animate-landing-pill-text-in' : 'motion-safe:opacity-0',
          )}
        >
          {label}
        </span>
      </span>
    </div>
  )
}

interface LandingHighlightArticleProps {
  story: Story
  variant: 'lead' | 'side'
}

export function LandingHighlightArticle({ story, variant }: LandingHighlightArticleProps) {
  const lead = variant === 'lead'

  return (
    <article
      id={landingHighlightStoryId(story)}
      className="scroll-mt-24 border-b border-gray-300 pb-6"
    >
      <LandingHighlightPhoto story={story} />
      <LandingHighlightTag label={story.category} lead={lead} />
      {/* Typefaces kept outside cn: tailwind-merge drops font-[…] as clashing with font-bold. */}
      <h3
        className={`${LANDING_SLAB} ${cn(
          'mt-2.5 font-bold text-pretty text-[var(--cares-primary)]',
          lead ? 'text-[1.75rem] leading-[1.15] sm:text-[2rem]' : 'text-[1.3rem] leading-[1.2]',
        )}`}
      >
        {story.summary}
      </h3>
      {story.detail && (
        <p
          className={`${LANDING_BANNER_SERIF} ${cn(
            'mt-2.5 leading-[1.6] text-pretty text-gray-800',
            lead ? 'text-[14.5px]' : 'text-[13px]',
          )}`}
        >
          {story.detail}
        </p>
      )}
    </article>
  )
}
