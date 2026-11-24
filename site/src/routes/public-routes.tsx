import type { RouteObject } from "react-router-dom";
import { LandingLayout } from "../components/public/landing-layout";
import { LandingScrollRoot } from "../components/public/landing-scroll-root";
import { LandingSectionRedirect } from "../components/public/landing-section-redirect";
import { LANDING_SECTION_IDS } from "../constants/landing-bulletin";
import {
    ABOUT_PATH,
    HIGHLIGHTS_PATH,
    HOME_PATH,
    PROGRAM_BULLETIN_PAGE_PATH,
    PRIVACY_POLICY_PATH,
    PROGRAMS_PATH,
    REGISTRATION_STATUS_PATH,
    TERMS_OF_SERVICE_PATH,
} from "../constants/routes";
import Home from "../pages/public/Home";
import PrivacyPolicyPage from "../pages/public/privacy-policy-page";
import ProgramBulletinPage from "../pages/public/program-bulletin-page";
import RegistrationStatusPage from "../pages/public/registration-status-page";
import TermsOfServicePage from "../pages/public/terms-of-service-page";
import { authRoutes } from "./auth-routes";

/** The public site: a single scrolling page, with the old page paths pointing at its sections. */
export const publicRoutes: RouteObject[] = [
    {
        element: <LandingScrollRoot />,
        children: [
            // Outside the layout: a scanned page takes the whole screen, no header or footer.
            { path: PROGRAM_BULLETIN_PAGE_PATH, element: <ProgramBulletinPage /> },
            // Standalone too: the email's "Check status" link opens straight onto the card.
            { path: REGISTRATION_STATUS_PATH, element: <RegistrationStatusPage /> },
            { path: ABOUT_PATH, element: <LandingSectionRedirect sectionId={LANDING_SECTION_IDS.about} /> },
            { path: PROGRAMS_PATH, element: <LandingSectionRedirect sectionId={LANDING_SECTION_IDS.programs} /> },
            { path: HIGHLIGHTS_PATH, element: <LandingSectionRedirect sectionId={LANDING_SECTION_IDS.highlights} /> },
            {
                element: <LandingLayout />,
                children: [
                    // One pathless route holds the page, so moving between /, /login and
                    // /request-access never remounts it; the auth paths only open a modal.
                    {
                        element: <Home />,
                        children: [{ path: HOME_PATH, element: null }, ...authRoutes],
                    },
                    // Own pages inside the site shell: the legal text is real, indexable content.
                    { path: PRIVACY_POLICY_PATH, element: <PrivacyPolicyPage /> },
                    { path: TERMS_OF_SERVICE_PATH, element: <TermsOfServicePage /> },
                ],
            },
        ],
    },
];
