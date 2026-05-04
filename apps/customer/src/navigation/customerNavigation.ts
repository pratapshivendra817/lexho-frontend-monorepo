export type CustomerTabKey = 'home' | 'notifications' | 'reviews' | 'bookings' | 'profile'

export const customerNavigation = {
  authStack: ['CustomerLogin', 'CustomerVerifyOtp'],
  appTabs: ['Lexho', 'Notifications', 'Reviews', 'Bookings', 'Profile'],
  tabItems: [
    { key: 'home', label: 'Lexho' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'profile', label: 'Profile' }
  ] satisfies Array<{ key: CustomerTabKey; label: string }>
}
