export interface CustomerMetric {
  label: string
  value: string
}

export interface ServiceCategory {
  id: string
  title: string
  tagline: string
}

export interface PopularService {
  id: string
  title: string
  subtitle: string
  badge: string
  price: number
}

export interface CustomerHomeFeed {
  location: {
    label: string
  }
  categories: ServiceCategory[]
  popularServices: PopularService[]
}

export interface CustomerBooking {
  id: string
  service: string
  schedule: string
  amount: number
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  providerName: string
}

export interface CustomerProfile {
  id: string
  fullName: string
  phone: string
  email: string
  city: string
  preferredLanguage: string
  walletBalance: number
}

export const customerMetrics: CustomerMetric[] = [
  { label: 'Upcoming Bookings', value: '3' },
  { label: 'Wallet Balance', value: 'Rs 1,250' },
  { label: 'Saved Addresses', value: '2' }
]

export const customerHomeFeed: CustomerHomeFeed = {
  location: { label: 'HSR Layout, Bengaluru' },
  categories: [
    { id: 'cleaning', title: 'Cleaning', tagline: 'Sparkling home in 90 mins' },
    { id: 'salon', title: 'Salon At Home', tagline: 'Pro stylists at your doorstep' },
    { id: 'repairs', title: 'Repairs', tagline: 'Electricians, plumbers, AC experts' }
  ],
  popularServices: [
    {
      id: 'svc-2201',
      title: 'Deep Home Cleaning',
      subtitle: 'Living Room + Kitchen + 1 Bath',
      badge: 'Top Rated',
      price: 1499
    },
    {
      id: 'svc-2202',
      title: 'Hair Spa + Styling',
      subtitle: 'Salon at Home',
      badge: 'Trending',
      price: 999
    },
    {
      id: 'svc-2203',
      title: 'AC Service',
      subtitle: 'Split/Window AC annual maintenance',
      badge: 'Fastest',
      price: 699
    }
  ]
}

export const customerBookings: CustomerBooking[] = [
  {
    id: 'BK-7781',
    service: 'Deep Home Cleaning',
    schedule: '2026-04-25 10:30 AM',
    amount: 1499,
    status: 'UPCOMING',
    providerName: 'Rahul Cleaning Services'
  },
  {
    id: 'BK-7755',
    service: 'AC Service',
    schedule: '2026-04-22 04:00 PM',
    amount: 699,
    status: 'COMPLETED',
    providerName: 'CoolFix Technicians'
  },
  {
    id: 'BK-7701',
    service: 'Salon At Home',
    schedule: '2026-04-20 06:30 PM',
    amount: 999,
    status: 'CANCELLED',
    providerName: 'StyleEase Studio'
  }
]

export const customerProfile: CustomerProfile = {
  id: 'CU-1148',
  fullName: 'Shivendra Kumar',
  phone: '9876543210',
  email: 'shivendra@example.com',
  city: 'Bengaluru',
  preferredLanguage: 'English',
  walletBalance: 1250
}
