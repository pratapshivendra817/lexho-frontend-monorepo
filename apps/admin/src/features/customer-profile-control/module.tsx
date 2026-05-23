import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const CustomerProfilesControlPage = lazy(() => import("./pages/CustomerProfilesControlPage"));
const ProfileContentControlPage = lazy(() => import("./pages/ProfileContentControlPage"));

export const customerProfileControlRoutes: AdminRouteConfig[] = [
  {
    path: "/customer-profile-control",
    children: [
      {
        index: true,
        element: <LazyScreen component={CustomerProfilesControlPage} />,
      },
      {
        path: "content",
        element: <LazyScreen component={ProfileContentControlPage} />,
      },
    ],
  },
];

export const customerProfileControlNavItems: AdminNavItem[] = [
  {
    path: "/customer-profile-control",
    label: "Customer Profiles",
  },
  {
    path: "/customer-profile-control/content",
    label: "Profile Content",
  },
];

export const customerProfileControlRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/customer-profile-control/content",
    title: "Profile Content Manager",
    breadcrumb: "Customer Profile / Content",
  },
  {
    pathPrefix: "/customer-profile-control",
    title: "Customer Profile Manager",
    breadcrumb: "Customer Profile / Data",
  },
];
