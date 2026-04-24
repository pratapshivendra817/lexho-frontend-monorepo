import { useMemo } from 'react'
import type { AxiosInstance } from 'axios'
import { createApiClient, type ApiClientOptions } from '@lexho/api'

export const useApi = (options: ApiClientOptions): AxiosInstance => {
  return useMemo(() => createApiClient(options), [options.baseURL, options.timeoutMs])
}
