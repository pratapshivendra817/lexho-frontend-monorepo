import type {
  CustomerBooking,
  CustomerHomeFeed,
  CustomerMetric,
  CustomerProfile,
  PopularService
} from '@/data/customerData'

import { apiRequest } from './client'

type UnknownRecord = Record<string, unknown>

function pickArray<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) {
    return payload as T[]
  }

  if (!payload || typeof payload !== 'object') {
    return []
  }

  const source = payload as UnknownRecord
  for (const key of keys) {
    const candidate = source[key]
    if (Array.isArray(candidate)) {
      return candidate as T[]
    }
  }

  return []
}

function pickObject<T>(payload: unknown, keys: string[]): T | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null
  }

  const source = payload as UnknownRecord
  for (const key of keys) {
    const candidate = source[key]
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return candidate as T
    }
  }

  return payload as T
}

export async function fetchCustomerMetrics() {
  const data = await apiRequest<unknown>('/api/customer/dashboard/metrics')
  return pickArray<CustomerMetric>(data, ['data', 'metrics', 'items', 'results'])
}

export async function fetchCustomerHomeFeed() {
  const data = await apiRequest<unknown>('/api/customer/home-feed')
  return pickObject<CustomerHomeFeed>(data, ['data', 'feed', 'homeFeed', 'result'])
}

export async function fetchPopularServices(categoryId?: string | number) {
  const query =
    categoryId !== undefined && categoryId !== null && String(categoryId).trim().length > 0
      ? `?categoryId=${encodeURIComponent(String(categoryId))}`
      : ''
  const data = await apiRequest<unknown>(`/api/customer/services/popular${query}`)
  return pickArray<PopularService>(data, ['data', 'services', 'items', 'results'])
}

export async function fetchPopularServicesByCategoryIds(categoryIds: Array<string | number>) {
  const entries = await Promise.all(
    categoryIds.map(async (categoryId) => {
      const services = await fetchPopularServices(categoryId)
      return [String(categoryId), services] as const
    })
  )

  return Object.fromEntries(entries) as Record<string, PopularService[]>
}

export async function fetchCustomerBookings() {
  const data = await apiRequest<unknown>('/api/customer/bookings')
  return pickArray<CustomerBooking>(data, ['data', 'bookings', 'items', 'results'])
}

export async function cancelCustomerBooking(bookingId: string) {
  await apiRequest(`/api/customer/bookings/${bookingId}/cancel`, {
    method: 'PATCH'
  })
}

export async function fetchCustomerProfile() {
  const data = await apiRequest<unknown>('/api/customer/profile')
  return pickObject<CustomerProfile>(data, ['data', 'profile', 'item', 'result'])
}

export async function updateCustomerProfile(payload: Partial<CustomerProfile>) {
  const data = await apiRequest<unknown>('/api/customer/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })

  return pickObject<CustomerProfile>(data, ['data', 'profile', 'item', 'result'])
}

export type HomepageBannerQuery = {
  city?: string
  serviceCategoryId?: number
  platformType?: 'WEB' | 'ANDROID' | 'IOS'
  newUser?: boolean
  premiumUser?: boolean
  orderValue?: number
  userId?: number
  deviceId?: string
  placement?: 'TOP' | 'BOTTOM'
  slotNumber?: number
}

export type HomepageBanner = {
  id: string
  title?: string
  imageUrl?: string
  redirectUrl?: string
  promoType?: string
  platformType?: string
  placement?: 'TOP' | 'BOTTOM'
  slotNumber?: number
  priority?: number
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function normalizePlacement(value: unknown): 'TOP' | 'BOTTOM' {
  const placement = asString(value).toUpperCase()
  if (placement === 'TOP' || placement === 'HOME_TOP') return 'TOP'
  if (placement === 'BOTTOM' || placement === 'HOME_BOTTOM') return 'BOTTOM'
  return 'BOTTOM'
}

function toAbsoluteImageUrl(url: string): string {
  const value = url.trim()
  if (!value) return value
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('/')) return value
  return `/${value}`
}

function pickBannerRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[]
  if (!payload || typeof payload !== 'object') return []

  const source = payload as UnknownRecord
  const nestedData =
    source.data && typeof source.data === 'object' && !Array.isArray(source.data)
      ? (source.data as UnknownRecord)
      : null
  const candidates = [
    source.data,
    source.content,
    source.banners,
    source.items,
    source.results,
    nestedData?.content,
    nestedData?.items,
    nestedData?.banners,
    nestedData?.results
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as Record<string, unknown>[]
  }

  return []
}

function buildQuery(params: HomepageBannerQuery) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    search.set(key, String(value))
  })
  const query = search.toString()
  return query.length > 0 ? `?${query}` : ''
}

export async function fetchHomepageBanners(params: HomepageBannerQuery) {
  const query = buildQuery(params)
  const mapRowsToBanners = (rows: Record<string, unknown>[]) =>
    rows.map((row) => ({
      id: asString(row.id ?? row.bannerId),
      title: asString(row.title) || undefined,
      imageUrl: toAbsoluteImageUrl(asString(row.imageUrl ?? row.bannerImageUrl ?? row.thumbnailUrl)) || undefined,
      redirectUrl: asString(row.redirectUrl) || undefined,
      promoType: asString(row.promoType) || undefined,
      platformType: asString(row.platformType) || undefined,
      placement: normalizePlacement(row.placement ?? row.bannerPlacement ?? row.section),
      slotNumber: Number(row.slotNumber ?? row.slot ?? 1),
      priority: Number(row.priority ?? 0)
    })) satisfies HomepageBanner[]

  const primaryData = await apiRequest<unknown>(`/api/banners/homepage${query}`)
  let rows = pickBannerRows(primaryData)

  // Fallback for environments where homepage endpoint does not return placement-wise rows.
  if (rows.length === 0) {
    try {
      const fallbackData = await apiRequest<unknown>(`/api/customer/home/banners${query}`)
      rows = pickBannerRows(fallbackData)
      if (import.meta.env.DEV) {
        console.warn('[web:fetchHomepageBanners:fallbackUsed]', { query, fallbackCount: rows.length })
      }
    } catch {
      // Keep rows empty and let UI render no banners gracefully.
    }
  }

  if (import.meta.env.DEV) {
    console.log('[web:fetchHomepageBanners:response]', {
      count: rows.length,
      sampleImageUrl: asString(rows[0]?.imageUrl ?? rows[0]?.bannerImageUrl ?? rows[0]?.thumbnailUrl) || null
    })
    if (rows.length === 0) {
      console.warn('[web:fetchHomepageBanners:empty]', { query })
    }
  }

  const banners = mapRowsToBanners(rows)

  if (import.meta.env.DEV) {
    const missingImageIds = banners.filter((banner) => !banner.imageUrl).map((banner) => banner.id)
    if (missingImageIds.length > 0) {
      console.warn('[web:fetchHomepageBanners:missingImageUrl]', { missingImageIds })
    }
  }

  return banners
}

export async function trackBannerClick(id: string) {
  await apiRequest(`/api/banners/${id}/click`, { method: 'POST' })
}

export async function trackBannerImpression(id: string) {
  await apiRequest(`/api/banners/${id}/impression`, { method: 'POST' })
}

export async function redeemBanner(id: string) {
  await apiRequest(`/api/banners/${id}/redeem`, { method: 'POST' })
}
