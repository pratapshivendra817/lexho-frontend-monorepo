import { lazy } from "react";
import { LazyScreen } from "../../navigation/LazyScreen";
import type { AdminNavItem, AdminRouteConfig, AdminRouteMeta } from "../../navigation/types";
const AccountDeletionPage=lazy(()=>import("./pages/AccountDeletionPage"));
export const accountDeletionRoutes:AdminRouteConfig[]=[{path:"/account-deletion",element:<LazyScreen component={AccountDeletionPage}/> }];
export const accountDeletionNavItems:AdminNavItem[]=[{path:"/account-deletion",label:"Account Deletion"}];
export const accountDeletionRouteMeta:AdminRouteMeta[]=[{pathPrefix:"/account-deletion",title:"Account Deletion",breadcrumb:"Legal & Compliance / Account Deletion"}];
