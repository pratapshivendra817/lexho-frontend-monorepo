import { API_BASE_URL as ENV_API_BASE_URL } from "../constants/env";

export const API_BASE_URL = ENV_API_BASE_URL;
export const AUTH_TOKEN_STORAGE_KEY = "@customer/auth-token";
export const USER_STORAGE_KEY = "@customer/user";
export const THEME_MODE_STORAGE_KEY = "@customer/theme-mode";
export const CART_STORAGE_KEY = "@customer/cart";
export const ENABLE_FIREBASE_PUSH = true;
export const OTP_LENGTH = 6;

export const STORAGE_KEYS = {
  authToken: AUTH_TOKEN_STORAGE_KEY,
  user: USER_STORAGE_KEY,
  themeMode: THEME_MODE_STORAGE_KEY,
  cart: CART_STORAGE_KEY,
};

export const QUERY_KEYS = {
  home: ["home"],
  banners: ["banners", "homepage"],
  categories: ["categories"],
  services: (categoryId) => ["services", categoryId],
  cart: ["cart"],
  orders: ["orders"],
  order: (orderId) => ["orders", orderId],
  dashboard: ["dashboard"],
  notifications: (page, size) => ["notifications", page, size],
  notificationUnreadCount: ["notifications", "unread-count"],
  reviews: ["reviews"],
};
