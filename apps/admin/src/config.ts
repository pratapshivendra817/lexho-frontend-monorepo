import { API_BASE_URL_BY_ENV, AppEnvironment } from '@lexho/constants'

export const appConfig = {
  env: (import.meta.env.VITE_APP_ENV as AppEnvironment | undefined) ?? AppEnvironment.DEV,
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL ??
    API_BASE_URL_BY_ENV[(import.meta.env.VITE_APP_ENV as AppEnvironment | undefined) ?? AppEnvironment.DEV]
}
