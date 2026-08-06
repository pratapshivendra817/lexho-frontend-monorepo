import { lazy } from "react";

import { LazyScreen } from "@/navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "@/navigation/types";

const BannerListPage = lazy(() => import("./pages/BannerListPage"));
const BannerCreatePage = lazy(() => import("./pages/BannerCreatePage"));
const BannerEditPage = lazy(() => import("./pages/BannerEditPage"));

export const bannerManagementRoutes: AdminRouteConfig[] = [
  {
    path: "/banner-management",
    children: [
      {
        index: true,
        element: <LazyScreen component={BannerListPage} />,
      },
      {
        path: "create",
        element: <LazyScreen component={BannerCreatePage} />,
      },
      {
        path: ":id/edit",
        element: <LazyScreen component={BannerEditPage} />,
      },
    ],
  },
];

export const bannerManagementNavItems: AdminNavItem[] = [];

export const bannerManagementRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/banner-management/create",
    title: "Create Banner",
    breadcrumb: "banner management / create",
  },
  {
    pathPrefix: "/banner-management/",
    title: "Edit Banner",
    breadcrumb: "banner management / edit",
  },
  {
    pathPrefix: "/banner-management",
    title: "Category Banner Management",
    breadcrumb: "category banner management",
  },
];
