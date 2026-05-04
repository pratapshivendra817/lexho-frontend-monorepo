export type PartnerTabKey =
  | 'dashboard'
  | 'onboarding'
  | 'notifications'
  | 'reviews'
  | 'leads'
  | 'orders'
  | 'payouts'
  | 'profile'

export const partnerNavigation = {
  authStack: ['PartnerLogin', 'PartnerVerifyOtp'],
  appTabs: ['Onboarding', 'Notifications', 'Reviews', 'Leads', 'Orders', 'Payouts', 'Profile'],
  tabItems: [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'onboarding', label: 'Onboarding' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'leads', label: 'Leads' },
    { key: 'orders', label: 'Orders' },
    { key: 'payouts', label: 'Payouts' },
    { key: 'profile', label: 'Profile' }
  ] satisfies Array<{ key: PartnerTabKey; label: string }>
}
