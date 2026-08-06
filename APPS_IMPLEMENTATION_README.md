# Lexho Apps Implementation Overview

Single-file summary of what is currently implemented across the three main apps in this repo:

- Admin web: `apps/admin`
- Customer mobile: `apps/customer/legacy-mobile`
- Partner mobile: `apps/partner/legacy-mobile`

This is a repo-state summary based on the current code structure, screens, routes, services, and integration wiring.

## 1. Admin App

Path: `apps/admin`

### Current Shape

- React web admin app with protected routing, login, OTP verification, persisted admin session, and a shared admin shell/layout
- Feature-first structure with route modules under `src/features/*` and some legacy/newer route modules under `src/modules/*`
- Browser push bootstrap and admin notification wiring present in the app shell

### Implemented Feature Areas

- Auth and session
  - Admin login
  - OTP verification
  - Access token and refresh token handling
  - Protected/private route guards

- Dashboard and monitoring
  - Dashboard
  - Revenue/stat cards and charts
  - API readiness page
  - Razorpay webhook monitoring
  - Audit logs
  - Activity logs

- Marketplace and catalog management
  - Categories
  - Services
  - Service details
  - Popular services
  - Recommended add-ons
  - Sections management
  - Home banners
  - Category banner management
  - Cook family sizes
  - Cleaning coverage
  - Cart and booking settings

- Customer and booking operations
  - Users listing and management
  - User create/edit/details
  - Bookings listing
  - Booking details
  - Booking edit
  - Manual dispatch actions
  - Customer profile control
  - Customer profile content control

- Partner and dispatch operations
  - Partners listing
  - Partner verification/details
  - Live dispatch monitor
  - Serviceable areas
  - Geo cities and zones
  - Dispatch-related settings

- Payments and subscriptions
  - Payments
  - Payouts
  - Subscription listing/details
  - Subscription pricing
  - Cook subscription pricing

- Communication and support
  - Notification center
  - Notification details
  - Send/retry notifications
  - Browser push enable flow
  - Support and complaints
  - Support FAQs

- Quality and safety
  - Ratings and reviews moderation
  - Emergency SOS incidents
  - Emergency incident details

### Main Route Groups Present

- `/`
- `/users`
- `/bookings`
- `/partners`
- `/services`
- `/categories`
- `/serviceable-areas`
- `/live-dispatch`
- `/notifications`
- `/payments`
- `/payouts`
- `/subscriptions`
- `/support`
- `/reviews`
- `/emergency-sos`
- `/sections`
- `/banners`
- `/banner-management`
- `/recommended-addons`
- `/popular-services`
- `/cart-booking-settings`
- `/cook-family-sizes`
- `/cleaning-coverage`
- `/customer-profile-control`
- `/settings`
- `/webhooks`
- `/audit-logs`
- `/api-readiness`

### Notable Runtime Wiring

- Admin browser push notification registration
- Admin notification websocket hook
- Admin live ETA websocket hook
- Query-based data fetching and invalidation
- Shared admin shell with route rendering and error feedback

### Admin Caveats

- A lot of admin pages are implemented and routed, but final behavior still depends on backend response shape and permissions
- Push/browser notifications require valid Firebase web configuration and browser permission
- Live dispatch, audit logs, webhooks, and notifications rely on backend websocket/API availability

### Key Code References

- App shell: `apps/admin/src/App.tsx`
- Route registry: `apps/admin/src/navigation/adminRoutes.tsx`
- Admin layout: `apps/admin/src/layouts/AdminLayout.tsx`
- Push notifications: `apps/admin/src/services/adminPushNotifications.ts`

## 2. Customer App

Path: `apps/customer/legacy-mobile`

### Current Shape

- React Native customer app with auth bootstrap, Redux store, React Query, push notifications, analytics/crashlytics hooks, and a stack/tab navigation shell
- Booking lifecycle is backend-driven and the app routes screens from booking metadata
- Offline queue, notification socket, calling, SOS, and payment recovery wiring are present

### Implemented Feature Areas

- Auth and app bootstrap
  - Splash/auth hydration
  - Login
  - OTP verification
  - Session restore
  - Analytics/crashlytics user wiring

- Home and discovery
  - Home screen
  - Service sections
  - Banners/promotional cards
  - Service lists
  - Service details
  - Favorites
  - Reviews entry points

- Location and address management
  - Detecting location gate
  - Current-location flow
  - Location search
  - Map address picker
  - Add address details
  - Saved addresses
  - Coming soon / unserviceable flow

- Cart and checkout
  - Cart CRUD
  - Quantity and service cart logic
  - Coupon screen
  - Address selection
  - Time picker/cart summary helpers

- Booking creation flows
  - Instant booking wizard
  - Schedule booking wizard
  - Recurring booking
  - Subscription plan
  - Booking flow screens for select service/slot/confirm

- Booking lifecycle and history
  - Booking history
  - Booking details
  - Booking processing
  - Instant booking status
  - Scheduled booking status
  - Scheduled reschedule
  - Live tracking
  - Partner arrived
  - Service started
  - Service in progress
  - Service completed
  - Booking payment confirm
  - Subscription confirmed
  - Booking status fallback
  - Rate partner

- Payments
  - Payment screen
  - Payment status screen
  - Payment recovery after app reopen
  - Booking/payment API integrations

- Profile and account
  - Profile screen
  - Edit profile
  - Address screen
  - Referral screen
  - Legal content screen

- Notifications and support
  - Notifications list/search behavior
  - Push notification handling and deep-link style routing
  - Customer notification socket
  - Support screen
  - Support tickets
  - FAQ screen

- Safety and communication
  - SOS screen
  - Emergency contacts
  - Floating SOS button
  - Calling module with incoming/outgoing/active/missed call flows

- Reliability and instrumentation
  - Offline queue and retry
  - Network status syncing
  - Screen tracking
  - Firebase analytics
  - Firebase crashlytics
  - Monitoring helpers
  - SSL-pinning client support

### Main Navigation Surface

- Auth: `Login`, `Otp`
- Tabs: `Home`, `Bookings`, `Profile`
- Booking flows: `InstantBookingWizard`, `ScheduleBookingWizard`, `RecurringBooking`, `SubscriptionPlan`
- Booking lifecycle: `InstantBookingStatus`, `ScheduledBookingStatus`, `LiveTracking`, `PartnerArrived`, `ServiceStarted`, `ServiceInProgress`, `ServiceCompleted`, `BookingStatusFallback`
- Cart/payment: `CartCrud`, `Coupon`, `Payment`, `PaymentStatus`, `BookingPaymentConfirm`
- Location: `DetectingLocation`, `LocationSearch`, `MapAddressPicker`, `AddAddressDetails`, `ComingSoon`
- Profile/support: `Address`, `Referral`, `Support`, `Faq`, `EditProfile`, legal screens
- Calling: `IncomingCall`, `OutgoingCall`, `ActiveCall`, `MissedCall`

### Major API Surface Already Wired

- Auth
- Home feed
- Services
- Cart
- Coupons
- Addresses
- Bookings
- Booking extras
- Payments
- Notifications
- Favorites
- Referral
- Reviews
- Support
- Subscription
- Subscription pricing
- Subscription visits
- Customer profile
- Cook family size
- Cook coverage
- Cleaning coverage

### Customer Caveats

- Booking lifecycle behavior is intentionally backend-driven, so the final user flow depends heavily on `GET /api/bookings/details/{bookingId}` contract fields
- Push notifications require valid Firebase mobile setup and token registration
- Calling requires signaling/WebRTC/backend support
- Live tracking depends on location permission, GPS, and backend map/tracking data
- Some offline flows queue correctly on the frontend but still require backend replay success when connectivity returns

### Key Code References

- App shell: `apps/customer/legacy-mobile/src/App.tsx`
- Navigation: `apps/customer/legacy-mobile/src/navigation/AppNavigator.tsx`
- Booking lifecycle routing: `apps/customer/legacy-mobile/src/hooks/useBookingLifecycleNavigation.ts`
- Push notifications: `apps/customer/legacy-mobile/src/services/notificationsService.ts`
- Offline queue: `apps/customer/legacy-mobile/src/services/offlineQueue.ts`

## 3. Partner App

Path: `apps/partner/legacy-mobile`

### Current Shape

- React Native partner app with OTP auth, tab/stack navigation, Redux state, shift/location flows, notifications, chat, calling, SOS, and partner operations screens
- App shell includes offline handling, online-hours sync, crashlytics, analytics, and rooted/developer-mode blocking

### Implemented Feature Areas

- Auth and bootstrap
  - Mobile number login
  - OTP verification
  - Token/session restore
  - Logout/session cleanup

- Home and dashboard
  - Home dashboard
  - Online/offline toggle
  - Location label
  - Quick actions
  - Partner stats
  - Banner support

- Dispatch and order management
  - New orders / dispatch requests
  - Accept/reject order flows
  - Order details
  - Active job
  - Order history
  - Timeline-based order states

- Shift, availability, and live location
  - Shift start/end
  - Availability updates
  - Shift history
  - Current location detection
  - Dispatch location updates
  - Background location helpers

- Onboarding, profile, and compliance
  - Onboarding submit
  - Document upload
  - Profile image upload
  - Profile update
  - KYC status
  - Bank details
  - Dispatch skills fetch/update

- Earnings and payouts
  - Earnings summary
  - Earnings transactions
  - Payouts
  - Payout details
  - Withdrawals

- Communication
  - Notifications
  - Chat list
  - Order chat
  - Send/read messages
  - Incoming/outgoing/active/missed call flows

- Tracking and safety
  - Route map
  - Live tracking
  - SOS
  - Emergency contacts
  - SOS history

- Partner operations
  - Performance dashboard
  - Ratings
  - Leave management
  - Service areas
  - Warning center

- Reliability and security
  - Offline queue/retry support
  - Online-hours sync
  - Crashlytics and analytics hooks
  - Rooted/developer-mode block screen
  - SSL client support

### Main Navigation Surface

- Auth: `Login`, `OTP`
- Tabs: `Home`, `Profile`, `Alerts`, `Chats`, `Support`
- Orders: `Orders`, `OrderDetails`, `History`, `ActiveJob`
- Shift/ops: `Shift`, `Performance`, `Ratings`, `LeaveManagement`, `ServiceAreas`, `WarningCenter`
- Payments: `Earnings`, `Payouts`, `PayoutDetail`, `BankAccount`, `Withdrawals`
- Compliance: `DocumentUpload`, `OnboardingSubmit`, `KycStatus`
- Communication: `ChatList`, `Chat`, `IncomingCall`, `OutgoingCall`, `ActiveCall`, `MissedCall`
- Tracking/safety: `RouteMap`, `LiveTracking`, `SOS`, `EmergencyContacts`, `SOSHistory`, `BackgroundLocationEducation`

### Partner Caveats

- Some features are frontend-ready but still depend on backend/environment correctness at runtime
- Push notifications depend on Firebase configuration and valid device-token registration
- Calling depends on signaling/WebRTC/backend support
- Live tracking depends on device permissions, GPS availability, and backend location endpoints
- Performance screen exists, but richer charts/trend views still depend on backend trend data

### Key Code References

- App shell: `apps/partner/legacy-mobile/App.tsx`
- Navigation: `apps/partner/legacy-mobile/src/navigation/AppNavigator.tsx`
- Partner APIs: `apps/partner/legacy-mobile/src/services/partnerService.ts`
- Shift APIs: `apps/partner/legacy-mobile/src/features/shift/shiftApi.ts`
- Notifications: `apps/partner/legacy-mobile/src/services/notificationsService.ts`

## 4. Overall Repo Conclusion

### Already Built At A High Level

- Admin web has broad management coverage across users, bookings, partners, catalog, notifications, live dispatch, support, payouts, subscriptions, and monitoring
- Customer mobile has end-to-end customer journey coverage from login to service discovery, booking, payment, tracking, support, notifications, calling, and SOS
- Partner mobile has end-to-end partner journey coverage from login to availability, dispatch, order handling, earnings, payouts, chat, calling, tracking, and operational controls

### Still Runtime-Dependent

- Firebase push flows
- Websocket/live updates
- Calling/WebRTC
- Live tracking/maps
- Some reporting/analytics data richness
- Any screen whose final state depends on backend contract completeness

### Recommended Follow-Up

- Use this file as the single shareable implementation snapshot
- If needed, the next useful step would be a second document with three buckets:
  - Fully ready
  - Backend dependent
  - Still partial or polish-only
