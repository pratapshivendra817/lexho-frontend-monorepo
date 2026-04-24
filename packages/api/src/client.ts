import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios'

export type UnauthorizedHandler = () => Promise<void> | void

export interface ApiClientOptions {
  baseURL: string
  timeoutMs?: number
  getToken?: () => Promise<string | null> | string | null
  onUnauthorized?: UnauthorizedHandler
}

export const createApiClient = (options: ApiClientOptions): AxiosInstance => {
  const client = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeoutMs ?? 20000
  })

  client.interceptors.request.use(async (config) => {
    if (!options.getToken) {
      return config
    }

    const token = await options.getToken()
    if (token) {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  })

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (error.response?.status === 401 && options.onUnauthorized) {
        await options.onUnauthorized()
      }

      return Promise.reject(error)
    }
  )

  return client
}

export const withApiConfig = <T>(config: AxiosRequestConfig<T>): AxiosRequestConfig<T> => config
