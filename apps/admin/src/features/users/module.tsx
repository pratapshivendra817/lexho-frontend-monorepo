import { lazy } from "react";

import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";

const UsersPage = lazy(() => import("./pages/UsersPage"));
const CreateUserPage = lazy(() => import("./pages/CreateUserPage"));
const EditUserPage = lazy(() => import("./pages/EditUserPage"));
const UserDetailsPage = lazy(() => import("./pages/UserDetailsPage"));

export const usersRoutes: AdminRouteConfig[] = [
  {
    path: "/users",
    children: [
      {
        index: true,
        element: <LazyScreen component={UsersPage} />,
      },
      {
        path: "new",
        element: <LazyScreen component={CreateUserPage} />,
      },
      {
        path: ":id/edit",
        element: <LazyScreen component={EditUserPage} />,
      },
      {
        path: ":id",
        element: <LazyScreen component={UserDetailsPage} />,
      },
    ],
  },
];

export const usersNavItems: AdminNavItem[] = [
  {
    path: "/users",
    label: "Users",
  },
];

export const usersRouteMeta: AdminRouteMeta[] = [
  {
    pathPrefix: "/users/new",
    title: "Create User",
    breadcrumb: "users / create",
  },
  {
    pathPrefix: "/users/",
    title: "User Details",
    breadcrumb: "users / details",
  },
  {
    pathPrefix: "/users",
    title: "Users",
    breadcrumb: "users",
  },
];

