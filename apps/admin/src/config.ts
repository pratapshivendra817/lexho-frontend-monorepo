import { API_BASE_URL_BY_ENV, AppEnvironment } from '@lexho/constants'

const isKnownEnvironment = (value: string | undefined): value is AppEnvironment =>
  value === AppEnvironment.DEV ||
  value === AppEnvironment.STAGING ||
  value === AppEnvironment.PRODUCTION

const rawEnv = import.meta.env.VITE_APP_ENV?.trim()
const env = isKnownEnvironment(rawEnv) ? rawEnv : AppEnvironment.DEV
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
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim() ?? "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ?? "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() ?? "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() ?? "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() ?? "",
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim() ?? "",
  },
}
