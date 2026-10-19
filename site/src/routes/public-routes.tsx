import type { RouteObject } from "react-router-dom";
import { LandingLayout } from "../components/public/landing-layout";
import {
    ABOUT_PATH,
    HIGHLIGHTS_PATH,
    PROGRAMS_PATH,
    STAFF_PORTAL_PATH,
} from "../constants/routes";
import About from "../pages/public/about";
import Highlights from "../pages/public/highlights";
import Home from "../pages/public/Home";
import Programs from "../pages/public/programs";
import StaffPortal from "../pages/public/staff-portal";

/** The public site: one shared header/footer layout around each page. */
export const publicRoutes: RouteObject[] = [
    {
        element: <LandingLayout />,
        children: [
            { path: '/', element: <Home /> },
            { path: ABOUT_PATH, element: <About /> },
            { path: PROGRAMS_PATH, element: <Programs /> },
            { path: HIGHLIGHTS_PATH, element: <Highlights /> },
            { path: STAFF_PORTAL_PATH, element: <StaffPortal /> },
        ],
    },
];
