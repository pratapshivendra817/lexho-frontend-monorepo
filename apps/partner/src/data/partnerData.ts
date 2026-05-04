export interface PartnerLead {
  id: string
  customer: string
  service: string
  area: string
  payout: number
  status: 'NEW' | 'ACCEPTED' | 'COMPLETED'
}

export interface PartnerMetric {
  label: string
  value: string
}

export interface PartnerOrder {
  id: string
  customer: string
  service: string
  schedule: string
  amount: number
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
}

export interface PartnerPayout {
  id: string
  period: string
  completedJobs: number
  grossAmount: number
  deductions: number
  netAmount: number
  status: 'PROCESSING' | 'PAID' | 'HOLD'
}

export interface PartnerProfile {
  id: string
  fullName: string
  phone: string
  email: string
  city: string
  rating: number
  completedJobs: number
  services: string[]
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'
}

export const partnerMetrics: PartnerMetric[] = [
  { label: 'Today Leads', value: '6' },
  { label: 'Jobs Completed', value: '42' },
  { label: 'Pending Payout', value: 'Rs 8,750' }
]

export const partnerLeads: PartnerLead[] = [
  {
    id: 'LD-2001',
    customer: 'Ritika Jain',
    service: 'Deep Cleaning',
    area: 'Indiranagar',
    payout: 650,
    status: 'NEW'
  },
  {
    id: 'LD-2002',
    customer: 'Manish Kumar',
    service: 'Plumbing',
    area: 'HSR Layout',
    payout: 500,
    status: 'ACCEPTED'
  },
  {
    id: 'LD-1998',
    customer: 'Neha Singh',
    service: 'Salon',
    area: 'Koramangala',
    payout: 900,
    status: 'COMPLETED'
  }
]

export const partnerOrders: PartnerOrder[] = [
  {
    id: 'OD-4412',
    customer: 'Kavya Nair',
    service: 'Deep Cleaning',
    schedule: '2026-04-24 02:00 PM',
    amount: 1299,
    status: 'ASSIGNED'
  },
  {
    id: 'OD-4408',
    customer: 'Arjun Rao',
    service: 'Plumbing',
    schedule: '2026-04-24 11:30 AM',
    amount: 799,
    status: 'IN_PROGRESS'
  },
  {
    id: 'OD-4391',
    customer: 'Nisha Dutta',
    service: 'Salon at Home',
    schedule: '2026-04-23 05:30 PM',
    amount: 1599,
    status: 'COMPLETED'
  }
]

export const partnerPayouts: PartnerPayout[] = [
  {
    id: 'PO-1103',
    period: 'Apr 16 - Apr 22',
    completedJobs: 14,
    grossAmount: 18200,
    deductions: 1460,
    netAmount: 16740,
    status: 'PROCESSING'
  },
  {
    id: 'PO-1102',
    period: 'Apr 09 - Apr 15',
    completedJobs: 18,
    grossAmount: 24600,
    deductions: 1968,
    netAmount: 22632,
    status: 'PAID'
  },
  {
    id: 'PO-1101',
    period: 'Apr 02 - Apr 08',
    completedJobs: 12,
    grossAmount: 13900,
    deductions: 1112,
    netAmount: 12788,
    status: 'PAID'
  }
]

export const partnerProfile: PartnerProfile = {
  id: 'PT-7782',
  fullName: 'Ravi Kumar',
  phone: '9876543210',
  email: 'ravi.partner@example.com',
  city: 'Bengaluru',
  rating: 4.7,
  completedJobs: 426,
  services: ['Deep Cleaning', 'Kitchen Cleaning', 'Bathroom Cleaning'],
  kycStatus: 'VERIFIED'
}
