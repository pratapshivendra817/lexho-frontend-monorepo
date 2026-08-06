import { API_BASE_URL as ENV_API_BASE_URL } from "../constants/env";

export const API_BASE_URL = ENV_API_BASE_URL;
export const AUTH_TOKEN_STORAGE_KEY = "@customer/auth-token";
export const USER_STORAGE_KEY = "@customer/user";
export const THEME_MODE_STORAGE_KEY = "@customer/theme-mode";
export const CART_STORAGE_KEY = "@customer/cart";
export const ENABLE_FIREBASE_PUSH = true;

export const STORAGE_KEYS = {
  authToken: AUTH_TOKEN_STORAGE_KEY,
  user: USER_STORAGE_KEY,
  themeMode: THEME_MODE_STORAGE_KEY,
  cart: CART_STORAGE_KEY,
} as const;

export const QUERY_KEYS = {
  home: ["home"] as const,
  banners: ["banners", "homepage"] as const,
  categories: ["categories"] as const,
  services: (categoryId: string) => ["services", categoryId] as const,
  cart: ["cart"] as const,
  orders: ["orders"] as const,
  order: (orderId: string) => ["orders", orderId] as const,
  dashboard: ["dashboard"] as const,
  notifications: (page: number, size: number) => ["notifications", page, size] as const,
  notificationUnreadCount: ["notifications", "unread-count"] as const,
  reviews: ["reviews"] as const,
} as const;
