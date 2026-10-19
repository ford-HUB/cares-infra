import { Mail, MapPin, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LANDING_CONTACT, LANDING_NAV_LINKS, LANDING_SERIF } from '../../constants/landing-bulletin'

export function LandingFooter() {
  const contacts = [
    {
      icon: Mail,
      text: LANDING_CONTACT.email,
      href: `mailto:${LANDING_CONTACT.email}`,
    },
    { icon: Phone, text: LANDING_CONTACT.phone },
    { icon: MapPin, text: LANDING_CONTACT.address },
  ]

  return (
    <footer className="bg-[var(--cares-primary)] text-white/70">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-[1.2fr_0.6fr_1fr]">
        <div className="flex items-start gap-3">
          <img
            src="/transparent-logo.png"
            alt=""
            className="h-11 w-11 shrink-0 rounded-full bg-white object-contain p-1"
          />
          <div className="min-w-0">
            <p className={`${LANDING_SERIF} text-lg tracking-wide text-white`}>UCLM CARES</p>
            <p className="mt-1 text-[12px] leading-relaxed">
              Community Awareness, Relations and Extension Services
              <br />
              University of Cebu Lapu-Lapu and Mandaue
            </p>
          </div>
        </div>

        <nav aria-label="Footer">
          <p className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">
            Explore
          </p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[13px]">
            {LANDING_NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="rounded transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <ul className="flex flex-col gap-2 text-[13px]">
          {contacts.map((contact) => (
            <li key={contact.text} className="flex items-start gap-2.5">
              <contact.icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
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
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-5 py-4 text-[11px] text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            UCLM CARES Bulletin · {LANDING_BULLETIN.volume} · {LANDING_BULLETIN.issn}
          </p>
          <p>Staff access only. Volunteers use the CARES mobile app.</p>
        </div>
      </div> */}
    </footer>
  )
}
