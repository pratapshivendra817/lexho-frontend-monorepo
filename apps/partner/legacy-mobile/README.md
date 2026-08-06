# Partner Legacy Mobile

Partner React Native app for Lexho field partners.

## Current Status

The app already has a broad implemented surface area. Core frontend flows, navigation, state wiring, and API integrations are present in the codebase.

## Ready Modules

- Auth: mobile number login and OTP verification
- App shell: splash, tab navigation, stack navigation, logout/session reset
- Home dashboard: online/offline toggle, partner stats, banners, quick actions
- Dispatch and orders: new requests, accept/reject, order details, active job, order history, timeline-driven views
- Shift management: shift start/end, availability updates, shift history
- Live location: current-location detection, location sync, background tracking helpers
- Onboarding and KYC: onboarding submit, document upload, profile image upload, KYC status
- Profile and skills: profile fetch/update, dispatch skills fetch/update
- Earnings and payouts: earnings summary, transactions, payouts, payout details
- Banking and withdrawals: bank details, withdrawal balance, withdrawal requests
- Notifications: notification listing, unread count, read action, FCM registration/listeners
- Chat: chat list, per-order messages, send message, mark read
- Calling: outgoing/incoming/missed/active call screens and API wiring
- Navigation/tracking: route map and live tracking screens
- Safety: SOS, emergency contacts, SOS history, offline queue support
- Partner operations: performance, ratings, leave management, service areas, warning center
- Reliability and security: offline banner, queued retry handling, crashlytics/analytics hooks, rooted/developer-mode blocking

## Main Implemented Screens

- Auth: `Login`, `OTP`
- Tabs: `Home`, `Profile`, `Alerts`, `Chats`, `Support`
- Orders: `Orders`, `OrderDetails`, `History`, `ActiveJob`
- Operations: `Shift`, `Performance`, `Ratings`, `LeaveManagement`, `ServiceAreas`, `WarningCenter`
- Payments: `Earnings`, `Payouts`, `PayoutDetail`, `BankAccount`, `Withdrawals`
- Compliance: `DocumentUpload`, `OnboardingSubmit`, `KycStatus`
- Communication: `ChatList`, `Chat`, `IncomingCall`, `OutgoingCall`, `ActiveCall`, `MissedCall`
- Tracking and safety: `RouteMap`, `LiveTracking`, `SOS`, `EmergencyContacts`, `SOSHistory`, `BackgroundLocationEducation`

## Important Caveats

- Some features are frontend-ready but still depend on backend/environment correctness at runtime.
- Push notifications depend on Firebase configuration and valid device-token registration.
- Calling depends on signaling/WebRTC/backend support.
- Live tracking depends on device permissions, GPS availability, and backend location endpoints.
- Performance screen already exists, but richer charts/trend visualization still depends on backend trend data.

## Key Code References

- Navigation: `src/navigation/AppNavigator.tsx`
- App shell: `App.tsx`
- Partner APIs: `src/services/partnerService.ts`
- Shift APIs: `src/features/shift/shiftApi.ts`
- Notifications: `src/services/notificationsService.ts`
- Chat: `src/services/chatApi.ts`
- Calling: `src/services/callApi.ts`
- Location tracking: `src/services/locationTrackingService.ts`
- Security block: `src/services/security/rootDetectionService.ts`

## Testing Footprint

The partner app has broad automated test coverage across screens, hooks, services, shift flows, onboarding, auth, system screens, and calling flows.
