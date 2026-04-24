import { createApiClient } from '@lexho/api'
import { API_ENDPOINTS } from '@lexho/constants'
import { appConfig } from '../../config'

const authClient = createApiClient({
  baseURL: appConfig.apiBaseUrl
})

export const requestAdminOtp = async (payload: { email: string; password: string }) => {
  return authClient.post(API_ENDPOINTS.auth.login, payload)
}

export const verifyAdminOtp = async (payload: { email: string; otp: string }) => {
  return authClient.post(API_ENDPOINTS.auth.verifyOtp, payload)
}
