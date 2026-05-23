# Service Booking Frontend Architecture Blueprint (Customer + Partner)

## 1) Scope
- React Native CLI monorepo with two mobile apps:
- `apps/customer/legacy-mobile`
- `apps/partner/legacy-mobile`
- Backend: Spring Boot monolith + JWT REST + WebSocket events.

## 2) Clean Architecture (Feature-first)
- `presentation`: screens, navigation, UI components, forms.
- `application`: use-cases/workflows (booking orchestration, payment retry, partner assignment listener).
- `domain`: enums, entities, business rules.
- `data`: API clients, DTO mappers, repositories, websocket adapters, storage adapters.

## 3) Recommended Folder Pattern Per App
```text
src/
  api/                    # axios instances, interceptors, endpoint clients
  application/            # use-cases
  components/
    booking/
  constants/
  domain/
    booking/
      enums.ts
      rules.ts
  navigation/
  redux/
    slices/
    store.ts
  screens/
  services/               # push, websocket, map, payment adapters
  storage/                # AsyncStorage wrappers
  theme/
  types/
```

## 4) Booking + Payment Business Rules
- Scheduled + COD: booking confirm first, collect payment on completion.
- Scheduled + UPI/CARD: prepay, then confirm booking.
- Instant + COD: search partner immediately, payment post-service.
- Instant + UPI/CARD: partner assign first, then collect payment.

## 5) Redux State Boundaries
- `authSlice`: JWT/session/profile.
- `bookingSlice`: booking list, current booking lifecycle status, retry counters.
- `paymentSlice`: method selection, attempt status, gateway response, timeout.
- `locationSlice`: current location, partner track points, route ETA.
- `partnerSlice`: partner meta/status.
- `notificationSlice`: push payload and in-app unread.
- `serviceSlice`: categories, details, pricing.

## 6) Realtime Event Handling
- Socket service should expose:
- `connect(token)`, `subscribe(channel)`, `emit(event,payload)`, `disconnect()`.
- Map server events to typed enums in `types/bookingLifecycle.ts`.
- Dispatch redux updates from one centralized event router to avoid screen-level duplication.

## 7) API Layer
- Axios `api/client.ts`:
- request interceptor adds JWT.
- response interceptor handles 401, refresh token, request replay.
- standard error shape mapper for UI-safe messages.
- add retry policy only for idempotent APIs (`GET`, safe `PUT`) with backoff.

## 8) Navigation
- Auth stack + role-based root.
- Customer tabs: Home, Bookings, Profile.
- Partner tabs: Home/Requests, Active Job, Earnings, Profile.
- Protected routes by token + onboarding completion.
- Deep links:
- `app://booking/:bookingId`
- `app://payment/:bookingId/status`

## 9) Maps + Live Tracking
- `LiveMapView` component for customer tracking.
- Partner app sends periodic location updates (adaptive interval based on movement + app state).
- Persist last route polyline snapshot for reconnect recovery.

## 10) Payments
- Gateway adapter abstraction:
- `createOrder()`, `openCheckout()`, `verify()`, `retry()`, `timeoutRecover()`.
- Keep gateway SDK details inside adapter, not in screens.
- Preserve idempotency key per payment attempt.

## 11) Notifications
- Firebase messaging service should:
- register token
- foreground handler
- background/open-app handlers
- route push payload to correct screen and refetch booking state.

## 12) Offline Strategy
- Queue critical actions:
- partner location patches
- payment verify polling
- booking status refresh
- retry queue on network restore.
- Show optimistic status badge plus sync indicator.

## 13) Security Recommendations
- JWT and refresh tokens in secure storage wrapper.
- Root/jailbreak detection awareness hooks for high-risk payment actions.
- SSL pinning recommended for production release build variants.
- Never trust client status transitions without backend confirmation.

## 14) What Was Added in This Iteration (Non-duplicate)
- Booking lifecycle enums and realtime event enums:
- `src/types/bookingLifecycle.ts`
- New reusable booking components:
- `StatusBadge`, `BookingCard`, `PaymentCard`, `PartnerCard`, `LiveMapView`, `OTPInput`, `RatingModal`, `PaymentBottomSheet`
- Missing customer lifecycle screens:
- `BookingProcessingScreen`
- `PartnerAssignedScreen`
- `ServiceStartedScreen`
- `ServiceCompletedScreen`
- `InvoiceScreen`
- `RatePartnerScreen`
- Navigation routes wired in `AppNavigator.tsx`.

