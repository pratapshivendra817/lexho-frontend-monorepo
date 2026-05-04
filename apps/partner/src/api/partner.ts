import type {
  PartnerLead,
  PartnerMetric,
  PartnerOrder,
  PartnerPayout,
  PartnerProfile
} from '@/data/partnerData'

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

export async function fetchPartnerMetrics() {
  const data = await apiRequest<unknown>('/api/partner/dashboard/metrics')
  return pickArray<PartnerMetric>(data, ['data', 'metrics', 'items', 'results'])
}

export async function fetchPartnerLeads() {
  const data = await apiRequest<unknown>('/api/partner/leads')
  return pickArray<PartnerLead>(data, ['data', 'leads', 'items', 'results'])
}

export async function updatePartnerLeadStatus(leadId: string, status: PartnerLead['status']) {
  await apiRequest(`/api/partner/leads/${leadId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  })
}

export async function fetchPartnerOrders() {
  const data = await apiRequest<unknown>('/api/partner/orders')
  return pickArray<PartnerOrder>(data, ['data', 'orders', 'items', 'results'])
}

export async function fetchPartnerPayouts() {
  const data = await apiRequest<unknown>('/api/partner/payouts')
  return pickArray<PartnerPayout>(data, ['data', 'payouts', 'items', 'results'])
}

export async function fetchPartnerProfile() {
  const data = await apiRequest<unknown>('/api/partner/profile')
  return pickObject<PartnerProfile>(data, ['data', 'profile', 'item', 'result'])
}

export async function updatePartnerProfile(payload: Partial<PartnerProfile>) {
  const data = await apiRequest<unknown>('/api/partner/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })

  return pickObject<PartnerProfile>(data, ['data', 'profile', 'item', 'result'])
}
