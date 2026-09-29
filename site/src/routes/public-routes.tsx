import type { RouteObject } from "react-router-dom";
import Home from "../pages/public/Home";

export const publicRoutes: RouteObject[] = [
    {
        path: '/',
        element: <Home />,
    },
];
