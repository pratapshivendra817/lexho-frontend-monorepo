import { API_BASE_URL_BY_ENV, AppEnvironment } from '@lexho/constants'

const env =
  (import.meta.env.VITE_APP_ENV as AppEnvironment | undefined) ?? AppEnvironment.DEV
const explicitApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const explicitImageUploadEndpoint = import.meta.env.VITE_ADMIN_IMAGE_UPLOAD_ENDPOINT?.trim()
const fallbackApiBaseUrl =
  env === AppEnvironment.DEV
    ? 'http://localhost:8082'
    : API_BASE_URL_BY_ENV[env]

export const appConfig = {
  env,
  apiBaseUrl: explicitApiBaseUrl && explicitApiBaseUrl.length > 0 ? explicitApiBaseUrl : fallbackApiBaseUrl,
  adminImageUploadEndpoint:
    explicitImageUploadEndpoint && explicitImageUploadEndpoint.length > 0
      ? explicitImageUploadEndpoint
      : '/api/admin/upload/image',
}
