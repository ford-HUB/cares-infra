import { LANDING_CONTAINER } from '../../constants/landing-bulletin'
import { LandingBannerTitle } from './ui/landing-banner-title'

interface LandingPageHeaderProps {
  title: string
  /** Closing words of the title, set in gold italic. */
  accent?: string
  description: string
  /** Photos that fade in from either side, with hills along the bottom edge. */
  photos?: {
    readonly left: string
    readonly right: string
    /** Where each photo is cropped from (CSS object-position), for a photo whose faces
     *  would fall outside the banner's wide strip if it were cropped from the middle. */
    readonly leftPosition?: string
    readonly rightPosition?: string
  }
  /** Colour of the section beneath, so the bottom hill blends into it. */
  waveFill?: 'sage' | 'white' | 'mint'
}

const PHOTO =
  'pointer-events-none absolute inset-y-0 h-full w-1/2 object-cover opacity-25 sm:w-2/5 sm:opacity-60'

/** Green banner that opens each section after Home on the public page. */
export function LandingPageHeader({
  title,
  accent,
  description,
  photos,
  waveFill = 'sage',
}: LandingPageHeaderProps) {
  return (
    <section className="relative overflow-hidden bg-[var(--cares-primary)] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-[var(--cares-primary-hover)] opacity-40 blur-3xl"
      />
      {photos ? (
        <>
          <img
            src={photos.left}
            alt=""
            aria-hidden
            style={{ objectPosition: photos.leftPosition }}
            className={`${PHOTO} left-0 [mask-image:linear-gradient(to_right,black_20%,transparent_95%)]`}
          />
          <img
            src={photos.right}
            alt=""
            aria-hidden
            style={{ objectPosition: photos.rightPosition }}
            className={`${PHOTO} right-0 [mask-image:linear-gradient(to_left,black_20%,transparent_95%)]`}
          />
          <svg
            aria-hidden
            viewBox="0 0 1440 90"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full sm:h-20"
          >
            <path
              d="M0 14 C120 34 200 72 360 78 C620 86 840 86 1100 78 C1250 72 1330 34 1440 16 V90 H0 Z"
              className="fill-[var(--cares-about-sage)] opacity-50"
            />
            <path
              d="M0 40 C120 56 220 84 380 86 C640 90 820 90 1080 86 C1230 84 1330 56 1440 42 V90 H0 Z"
              className={
                waveFill === 'white'
                  ? 'fill-white'
                  : waveFill === 'mint'
                    ? 'fill-emerald-50'
                    : 'fill-[var(--cares-about-bg)]'
              }
            />
          </svg>
        </>
      ) : (
        <img
          src="/transparent-logo.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-10 -bottom-16 hidden h-64 w-64 opacity-[0.07] sm:block"
        />
      )}
      <div
        className={`${LANDING_CONTAINER} relative pt-14 text-center sm:pt-16 ${photos ? 'pb-20 sm:pb-24' : 'pb-14 sm:pb-16'}`}
      >
        <LandingBannerTitle title={title} accent={accent} description={description} />
      </div>
    </section>
  )
}
