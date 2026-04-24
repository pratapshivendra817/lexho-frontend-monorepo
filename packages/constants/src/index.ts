export enum UserRole {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
  PARTNER = 'PARTNER'
}

export enum AppEnvironment {
  DEV = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    verifyOtp: '/auth/verify-otp',
    resendOtp: '/auth/resend-otp'
  },
  admin: {
    dashboard: '/admin/dashboard',
    users: '/admin/users',
    partners: '/admin/partners'
  }
} as const

export * from './env'
