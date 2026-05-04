const DEFAULT_API_BASE_URL = 'http://localhost:8082'

function resolveApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token =
    localStorage.getItem('customer_access_token') ??
    localStorage.getItem('access_token')

  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  })

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`)
  }

  return (await response.json()) as T
}
