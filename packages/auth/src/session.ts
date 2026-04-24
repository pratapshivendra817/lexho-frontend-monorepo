import { UserRole } from '@lexho/constants'
import { isValidOtp } from '@lexho/utils'
import type { TokenStorage } from './tokenStorage'

export interface SessionPayload {
  userId: string
  email: string
  role: UserRole
  accessToken: string
}

export interface OtpChallengeRequest {
  email: string
  password: string
}

export interface OtpVerifyRequest {
  email: string
  otp: string
}

export const validateOtpPayload = (payload: OtpVerifyRequest): boolean => {
  return Boolean(payload.email) && isValidOtp(payload.otp)
}

export const hasRole = (currentRole: UserRole | null, allowedRoles: UserRole[]): boolean => {
  return currentRole !== null && allowedRoles.includes(currentRole)
}

export const createSessionManager = (storage: TokenStorage) => {
  return {
    save: async (session: SessionPayload) => {
      await storage.setAccessToken(session.accessToken)
    },
    getToken: async () => storage.getAccessToken(),
    clear: async () => storage.clear()
  }
}
