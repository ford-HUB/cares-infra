import { Mail, MapPin, Phone } from "lucide-react";
import {
  LANDING_BANNER_SERIF,
  LANDING_CONTAINER,
  LANDING_CONTACT,
  LANDING_DISPLAY,
  LANDING_HERO_ACCENT,
} from "../../constants/landing-bulletin";

/** Site footer on deep CARES green with a soft glow: the logo and a two-tone serif
 *  "UCLM CARES" over the office name in spaced capitals, a hairline divider, then the
 *  contact lines, each behind a frosted-glass icon tile. */
export function LandingFooter() {
  const contacts = [
    {
      icon: Mail,
      text: LANDING_CONTACT.email,
      href: `mailto:${LANDING_CONTACT.email}`,
    },
    { icon: Phone, text: LANDING_CONTACT.phone },
    { icon: MapPin, text: LANDING_CONTACT.address },
  ];

  return (
    <footer className="bg-[var(--cares-primary)] bg-[radial-gradient(ellipse_at_70%_0%,rgb(34_120_70/0.45),transparent_60%),linear-gradient(to_right,rgb(6_58_32/0.6),transparent_50%)] text-white">
      <div
        className={`${LANDING_CONTAINER} grid items-center gap-8 py-12 md:grid-cols-[1fr_auto_1fr] md:gap-12`}
      >
        <div className="flex items-center gap-4">
          <img
            src="/transparent-logo.png"
            alt=""
            className="h-16 w-16 shrink-0 rounded-full bg-white object-contain p-0.5 shadow-md sm:h-20 sm:w-20"
          />
          <div className="min-w-0">
            <p
              className={`${LANDING_BANNER_SERIF} text-2xl leading-tight font-bold tracking-wide sm:text-[1.75rem]`}
            >
              UCLM <span className={LANDING_HERO_ACCENT}>CARES</span>
            </p>
            <p
              className={`${LANDING_DISPLAY} mt-1.5 max-w-xs text-[11px] leading-relaxed font-semibold tracking-[0.12em] text-white/85 uppercase sm:text-xs`}
            >
              Community Awareness, Relations and Extension Services
            </p>
          </div>
        </div>

        <span
          aria-hidden
          className="hidden w-px self-stretch bg-gradient-to-b from-transparent via-white/30 to-transparent md:block"
        />

        <ul className="flex flex-col gap-3 text-[13px] text-white/90">
          {contacts.map((contact) => (
            <li key={contact.text} className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/25 bg-gradient-to-b from-white/20 to-white/5 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-sm">
                <contact.icon aria-hidden className="h-4 w-4 text-white" />
              </span>
              {contact.href ? (
                <a
                  href={contact.href}
                  className="rounded transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  {contact.text}
                </a>
              ) : (
                <span>{contact.text}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* <div className="border-t border-white/10">
        <div className={`${LANDING_CONTAINER} flex flex-col gap-1 py-4 text-[11px] text-white/50 sm:flex-row sm:items-center sm:justify-between`}>
          <p>
            UCLM CARES Bulletin · {LANDING_BULLETIN.volume} · {LANDING_BULLETIN.issn}
          </p>
          <p>Staff access only. Volunteers use the CARES mobile app.</p>
        </div>
      </div> */}
    </footer>
  );
}
