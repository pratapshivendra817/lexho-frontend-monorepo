# Lexho Professional Management and Assignment System Audit

**Audit date:** 2026-09-20  
**Scope:** LexhoCustomer, LexhoPartner, LexhoAdmin, and the Spring Boot modular monolith under `output/subscription-backend`  
**Mode:** Read-only repository audit. No source code, configuration, migration, or database files were modified.

## A. Executive Summary

Lexho is a single Spring Boot modular monolith with React Admin, React Native Customer, and React Native Partner clients.

**Overall status: NOT production-ready** for a complete Professional Management, Availability, Dispatch, and Assignment System.

| Area | Readiness | Summary |
|---|---|---|
| Instant Booking | PARTIALLY IMPLEMENTED | Automatic dispatch, accept/decline, expiry, locking, and retry exist. Instant dispatch deliberately bypasses skill validation. Admin manual dispatch is not correctly wired. |
| Scheduled Booking | PARTIALLY IMPLEMENTED / NOT VERIFIED | Future slots and deferred dispatch logic exist. No verified activation scheduler, overlap detection, duration-aware conflict handling, or travel buffer enforcement was found. |
| Subscription Booking | PARTIALLY IMPLEMENTED | Recurrence, visits, per-visit dispatch, accept/decline, and retry exist. Approval, replacement, reassignment, and duplicate assignment paths are inconsistent. |
| Professional Management | PARTIALLY IMPLEMENTED | Documents, verification, approval, blocking, skills, shifts, availability, and service areas exist. Several fields are not consistently consumed by assignment logic. |

Primary backend evidence:

- [DispatchOrchestrationService.java](output/subscription-backend/application-module/src/main/java/com/lexho/user_service/dispatch/service/DispatchOrchestrationService.java)
- [PartnerDispatchEligibilityService.java](output/subscription-backend/application-module/src/main/java/com/lexho/user_service/dispatch/service/PartnerDispatchEligibilityService.java)
- [PartnerRequestService.java](output/subscription-backend/application-module/src/main/java/com/lexho/user_service/partnerrequest/service/PartnerRequestService.java)
- [SubscriptionAutoDispatchService.java](output/subscription-backend/application-module/src/main/java/com/lexho/user_service/subscription/service/SubscriptionAutoDispatchService.java)
- [AdminSubscriptionManagementService.java](output/subscription-backend/application-module/src/main/java/com/lexho/user_service/subscription/service/AdminSubscriptionManagementService.java)
- [ProfessionalChangeRequestService.java](output/subscription-backend/application-module/src/main/java/com/lexho/user_service/subscription/service/ProfessionalChangeRequestService.java)

## B. Feature Audit Matrix

| Feature | Status | Frontend Evidence | Backend Evidence | Database Evidence | Issue |
|---|---|---|---|---|---|
| Professional registration | IMPLEMENTED | Partner registration and profile flows | Partner provider services | `partners`, provider documents | Provider registration path exists. |
| Admin verification/approval | IMPLEMENTED | Admin provider management | Admin provider control services | KYC fields | Mandatory documents are checked. |
| Active/inactive/suspended status | PARTIALLY IMPLEMENTED | Provider verification UI | APPROVED, REJECTED, BLOCKED operations | `onboarding_status`, `kyc_status` | No clearly separate persisted active/suspended dispatch state. |
| Skills and categories | PARTIALLY IMPLEMENTED | Provider details/types | `PartnerServiceSkillRepository` used for scheduled/subscription dispatch | Partner skill tables | Instant dispatch bypasses skill matching. |
| Service areas and pincodes | PARTIALLY IMPLEMENTED | Provider service-area fields | Pincode serviceability, GPS, radius, and ETA checks | `provider_service_areas`, dispatch pincode fields | Provider-stored areas are not consistently the dispatch authority. |
| Shift start/end | IMPLEMENTED | `apps/partner/legacy-mobile/src/features/shift/shiftApi.ts` | Partner shift endpoints and eligibility checks | `partner_shifts` | Shift window is enforced for new dispatch. |
| Availability toggle | IMPLEMENTED | Partner Home and shift flows | Partner availability and dispatch availability endpoints | Partner availability and `partner_shifts` | Multiple compatibility APIs increase inconsistency risk. |
| Workload capacity | PARTIALLY IMPLEMENTED | Partner configuration exists | `activeJobsCount < maxActiveJobs` | `active_jobs_count`, `max_active_jobs` | Counter only; no schedule conflict detection. |
| Booking history | PARTIALLY IMPLEMENTED | Partner order history screens | Booking/order history services | Orders and lifecycle records | No unified assignment audit view verified. |
| Ratings/completed jobs | PARTIALLY IMPLEMENTED | Admin reviews and payouts | Subscription candidate sorting uses rating | Reviews, payouts, orders | Not consistently used by all dispatch modes. |
| Instant booking creation | IMPLEMENTED | Customer booking/cart flow | `LexhoExperienceController` calls dispatch | `orders`, booking events | Creation and immediate dispatch exist. |
| Instant eligibility | PARTIALLY IMPLEMENTED | None | Approval, shift, online, capacity, radius, ETA | Dispatch tables | Skill validation is explicitly bypassed. |
| Instant accept/decline | IMPLEMENTED | Partner New Orders/Home screens | `PartnerRequestController` and `PartnerRequestService` | `partner_service_requests` | Row locks and request ownership checks exist. |
| Instant retry/expiry | IMPLEMENTED | Partner request polling | Expiry scheduler and retry logic | Expiry and attempt fields | No direct admin notification path verified. |
| Admin manual instant dispatch | BROKEN | `apps/admin/src/features/bookings/api/bookingsApi.ts` sends no body | Backend requires address, service, and quantity | Existing order data exists | Frontend/backend contract mismatch. |
| Scheduled slot selection | IMPLEMENTED | Customer scheduled booking screens | Scheduled timestamp parsed server-side | `orders.scheduled_at` | UI and persistence exist. |
| Scheduled dispatch activation | NOT VERIFIED | No verified client trigger | Initial dispatch can be deferred | Booking status/events | No verified later activation path found. |
| Scheduled overlap prevention | MISSING | Admin booking date/time fields | No overlap query found | No conflict constraint | Double booking is possible. |
| Scheduled duration/buffer | MISSING | Duration fields exist | Not used for assignment conflicts | Duration may be stored | Travel buffer is absent. |
| Admin scheduled calendar | PARTIALLY IMPLEMENTED | Subscription calendar exists | No general partner availability calendar found | Visit/order dates exist | Operational calendar is incomplete. |
| Subscription creation | IMPLEMENTED | `subscriptionBookingApi.ts` | `SubscriptionBookingService.create()` | `subscription_master`, frequency, visits | Visits are generated during creation. |
| Subscription admin review | PARTIALLY IMPLEMENTED | Admin status controls | Generic status endpoint exists | `PENDING_ADMIN_REVIEW` exists | No dedicated approval business workflow. |
| Subscription recurrence/visits | IMPLEMENTED | Customer/admin visit views | Visit date generation and persistence | `subscription_visit`, `subscription_frequency` | Visit records are first-class. |
| Subscription eligibility | PARTIALLY IMPLEMENTED | Admin assignment UI | Skill, approval, shift, availability, GPS, radius, ETA | Assignment/request tables | No visit conflict checking. |
| Subscription partner accept/decline | PARTIALLY IMPLEMENTED | Generic partner dispatch flow is active | Per-visit flow is stronger; base flow is incomplete | Assignment status fields | Two competing assignment mechanisms exist. |
| Subscription admin assignment | PARTIALLY IMPLEMENTED | `SubscriptionDetailsPage.tsx` | Assignment creates a request for the first visit | Assignment tables | Does not fully assign all visits. |
| Subscription replacement | BROKEN/PARTIAL | Replacement action exists in Admin | Stores replacement metadata only | `replacement_partner_id` | Existing visit assignments are not migrated. |
| Professional change request | PARTIALLY IMPLEMENTED | Customer request and Admin review UI | Approval changes subscription status | `subscription_professional_change_request` | Approval does not dispatch replacement. |
| Notifications | PARTIALLY IMPLEMENTED | Customer/Partner notification clients exist | Notification infrastructure exists | `notifications`, logs/templates | No direct dispatch-to-notification producer was verified. |
| Authorization/ownership | IMPLEMENTED | Authenticated clients | Admin role checks, partner request ownership, customer subscription ownership | IDs and foreign keys | Legacy compatibility endpoints increase risk. |
| Concurrency protection | PARTIALLY IMPLEMENTED | Not applicable | Row locking for request/order acceptance | Unique assignment constraints | No equivalent schedule conflict locking. |

## C. Booking Flow Analysis

### Instant Booking

1. Customer selects Instant in the cart flow.
2. Backend creates an `Order`.
3. `LexhoExperienceController` calls `DispatchOrchestrationService.dispatchOrder()`.
4. Backend checks serviceable address, partner approval, shift, online/service availability, active-job capacity, GPS distance, and ETA.
5. Backend creates up to five pending partner requests.
6. Partner app reads `GET /api/v1/partner/requests`.
7. Partner accepts or declines.
8. Acceptance locks the request and order, rejects peer requests, assigns the partner, updates status, and increments workload.
9. Decline or expiry retries with excluded partners and expanded radius.
10. If no request remains, the order becomes `INSTANT_FAILED`.

**Difference from expected flow:** Instant dispatch bypasses skill/subcategory validation. Admin manual dispatch is not operational because the Admin client sends no required dispatch body.

### Scheduled Booking

1. Customer selects a future date and time slot.
2. Customer API submits booking type, date, and slot.
3. Backend parses `scheduledAt` and creates the order.
4. Backend marks the order as scheduled.
5. Dispatch logic can defer dispatch until a configured pre-dispatch window.
6. When dispatch runs, partner eligibility checks approval, shift, availability, capacity, skill, location, radius, and ETA.
7. Partner receives a request and can accept or decline.

**Critical difference:** The initial scheduled path defers dispatch before the activation window, but no verified scheduler or event consumer was found that later dispatches all deferred orders. No service-duration overlap or travel-buffer validation exists.

### Subscription Booking

1. Customer submits subscription details through `POST /api/subscription/create`.
2. Backend validates service, address ownership, geofence, frequency, dates, duration, and pricing.
3. Backend creates the payment order, subscription master, frequency rows, and one visit row per generated date.
4. Payment activation moves the subscription to `PENDING_ADMIN_REVIEW`.
5. Subscription auto-dispatch scans active subscriptions and due visits.
6. It prefers the assigned/replacement partner, then searches fallback partners.
7. Eligibility checks verification, online state, shift, service skill, location, radius, ETA, and workload counter.
8. A per-visit partner request is created.
9. Partner accepts or declines through the generic partner request flow.
10. Acceptance creates the visit service order and visit assignment.
11. Rejection or expiry retries another partner.

**Replacement difference:** Admin replacement writes `replacement_partner_id`, but existing visit assignments and orders are not migrated. Professional-change approval only changes status to `PENDING_PARTNER_ASSIGNMENT`; it does not initiate replacement dispatch.

## D. API and Database Evidence

### Main Backend APIs

- `POST /api/subscription/create`
- `POST /api/subscription/bookings`
- `GET /api/subscriptions/{id}/visits`
- `POST /api/subscriptions/{id}/dispatch`
- `POST /api/subscriptions/{id}/pause`
- `POST /api/subscriptions/{id}/resume`
- `POST /api/subscriptions/{id}/cancel`
- `POST /api/subscriptions/change-requests`
- `GET /api/subscriptions/change-requests`
- `GET /api/subscriptions/change-requests/admin`
- `PATCH /api/subscriptions/change-requests/{id}/review`
- `GET /api/v1/partner/requests`
- `PATCH /api/v1/partner/requests/{id}/accept`
- `PATCH /api/v1/partner/requests/{id}/reject`
- `PATCH /api/v1/partner/me/status`
- `POST /api/admin/dispatch/orders/{orderId}`
- `PATCH /api/admin/dispatch/orders/{orderId}/lifecycle`
- `GET /api/admin/subscriptions`
- `POST /api/admin/subscriptions/{id}/assign-partner`
- `POST /api/admin/subscriptions/{id}/replacement-partner`
- `PATCH /api/admin/subscriptions/{id}/visits/{visitId}/assign-partner`

### Main Backend Classes

- `DispatchOrchestrationService`
- `PartnerDispatchEligibilityService`
- `PartnerRequestService`
- `SubscriptionAutoDispatchService`
- `SubscriptionVisitOrderService`
- `AdminSubscriptionManagementService`
- `ProfessionalChangeRequestService`
- `SubscriptionPartnerAssignmentDecisionService`

### Frontend Evidence

- Customer booking creation: `apps/customer/legacy-mobile/src/api/bookingApi.ts`
- Customer subscription creation: `apps/customer/legacy-mobile/src/api/subscriptionBookingApi.ts`
- Customer subscription lifecycle: `apps/customer/legacy-mobile/src/api/subscriptionApi.ts`
- Admin booking dispatch: `apps/admin/src/features/bookings/api/bookingsApi.ts`
- Admin subscription dispatch: `apps/admin/src/features/subscriptions/api/subscriptionsApi.ts`
- Admin subscription UI: `apps/admin/src/features/subscriptions/pages/SubscriptionDetailsPage.tsx`
- Admin provider management: `apps/admin/src/features/providers/api/providersApi.ts`
- Partner requests: `apps/partner/legacy-mobile/src/services/partnerService.ts`
- Partner shift/availability: `apps/partner/legacy-mobile/src/features/shift/shiftApi.ts`
- Partner request screens: `apps/partner/legacy-mobile/src/screens/main/NewOrdersScreen.tsx` and `HomeScreen.tsx`

### Main Database Tables

- `partners`
- `provider_service_areas`
- `partner_shifts`
- `current_partner_locations`
- `partner_location_history`
- `partner_service_requests`
- `booking_events`
- `orders`
- `subscription_master`
- `subscription_frequency`
- `subscription_visit`
- `subscription_partner_assignment`
- `subscription_visit_partner_assignment`
- `subscription_professional_change_request`
- `notifications`
- `notification_logs`

### Relevant Migrations

- [V23__dispatch_core_foundation.sql](output/subscription-backend/application-module/src/main/resources/db/migration/application-module/V23__dispatch_core_foundation.sql)
- [V63__subscription_booking_apis.sql](output/subscription-backend/application-module/src/main/resources/db/migration/application-module/V63__subscription_booking_apis.sql)
- [V65__subscription_partner_assignment.sql](output/subscription-backend/application-module/src/main/resources/db/migration/application-module/V65__subscription_partner_assignment.sql)
- [V103__partner_service_requests_subscription_context.sql](output/subscription-backend/application-module/src/main/resources/db/migration/application-module/V103__partner_service_requests_subscription_context.sql)
- [V139__subscription_visit_service_orders.sql](output/subscription-backend/application-module/src/main/resources/db/migration/application-module/V139__subscription_visit_service_orders.sql)
- [V140__subscription_partner_assignment_decision_fields.sql](output/subscription-backend/application-module/src/main/resources/db/migration/application-module/V140__subscription_partner_assignment_decision_fields.sql)
- [V141__subscription_professional_change_requests.sql](output/subscription-backend/application-module/src/main/resources/db/migration/application-module/V141__subscription_professional_change_requests.sql)

## E. Critical Issues

### P0 - Critical

#### P0-1: Scheduled bookings may remain deferred indefinitely

1. **What:** Scheduled dispatch is deferred before the activation window, but no verified activation scheduler/event path was found.
2. **Where:** `DispatchOrchestrationService`; `DispatchCleanupScheduler`.
3. **Why:** Paid scheduled bookings may never reach a partner.
4. **Affected:** Scheduled bookings.
5. **Recommended fix:** Add an idempotent scheduled-dispatch job or durable event handler.

#### P0-2: Subscription replacement can leave future visits with the old partner

1. **What:** Replacement updates base assignment metadata but does not migrate existing visit assignments or orders.
2. **Where:** `AdminSubscriptionManagementService`.
3. **Why:** Customer, partner, visit, and order records can disagree.
4. **Affected:** Subscription bookings.
5. **Recommended fix:** Transactionally preserve completed visits, release/cancel future old assignments, assign the replacement, and redispatch future visits.

### P1 - Core Flow

#### P1-1: Admin manual dispatch frontend contract is broken

1. **What:** Admin sends `POST /api/admin/dispatch/orders/{id}` without a body.
2. **Where:** `apps/admin/src/features/bookings/api/bookingsApi.ts`; backend `DispatchRequest`.
3. **Why:** Backend requires `addressId`, `serviceId`, and `quantity`.
4. **Affected:** Instant and scheduled Admin-assisted dispatch.
5. **Recommended fix:** Send required values or provide a backend order-derived dispatch command.

#### P1-2: Admin lifecycle update uses the wrong field

1. **What:** Frontend sends `{ lifecycle }`; backend requires `{ status }`.
2. **Where:** `bookingsApi.ts`; `OrderLifecycleUpdateRequest`.
3. **Why:** Lifecycle updates fail validation.
4. **Affected:** All ordinary bookings.
5. **Recommended fix:** Align the API contract and add an integration test.

#### P1-3: Instant dispatch bypasses service eligibility

1. **What:** Instant candidates return eligible without `hasRequiredSkill(...)`.
2. **Where:** `DispatchOrchestrationService`.
3. **Why:** A partner may receive a service outside their approved skill/category.
4. **Affected:** Instant bookings.
5. **Recommended fix:** Normalize legacy skill data and enforce skill eligibility for every booking type.

#### P1-4: No scheduled overlap or duration conflict protection

1. **What:** Eligibility checks active-job count but not existing booking windows.
2. **Where:** Dispatch eligibility and repositories.
3. **Why:** A partner can accept overlapping appointments.
4. **Affected:** Scheduled and subscription bookings.
5. **Recommended fix:** Add locked interval queries using service duration and configurable travel buffers.

#### P1-5: Subscription base assignment bypasses visit-order lifecycle

1. **What:** `SubscriptionPartnerAssignmentDecisionService` accepts a base assignment without creating a visit order, incrementing workload, or revalidating dispatch eligibility.
2. **Why:** Subscription state can become confirmed while visits remain operationally unassigned.
3. **Affected:** Subscription bookings.
4. **Recommended fix:** Remove the duplicate path or route it through the per-visit dispatch service.

### P2 - Important Operational Gaps

- No dedicated Admin subscription approval workflow beyond generic status mutation.
- No available-professional suggestion endpoint or complete calendar-based assignment view.
- Professional-change approval does not automatically initiate redispatch.
- Per-visit Admin assignment stores an assignment but does not create a service order or update workload.
- No verified Admin notification for unassigned or failed bookings.
- Partner exposes dedicated subscription accept/decline methods, but primary order screens use generic dispatch acceptance.
- No explicit travel-buffer configuration is applied to conflicts.
- No replacement-specific end-to-end test.
- No end-to-end test for customer change request through replacement acceptance.
- Customer cannot select or propose a replacement professional.

### P3 - Improvements

- Multiple compatibility endpoints make API behavior difficult to reason about.
- Provider, partner, and professional terminology is inconsistent.
- Notification types exist without verified dispatch event producers.
- Assignment history is split across booking events, request rows, and assignment tables.
- Dispatch status names differ between frontend normalization and backend enums.

## F. Missing Feature Checklist

- [ ] Reliable scheduled-dispatch activation scheduler
- [ ] Backend skill enforcement for instant bookings
- [ ] Scheduled overlap detection
- [ ] Service-duration-aware availability
- [ ] Travel-time/configurable-buffer validation
- [ ] Unified assignment state model
- [ ] Reconcile duplicate subscription assignment flows
- [ ] Complete subscription Admin approval workflow
- [ ] Visit-level workload and conflict enforcement
- [ ] Complete replacement migration for future visits
- [ ] Old-partner release/cancellation during replacement
- [ ] Automatic redispatch after professional-change approval
- [ ] Replacement-specific partner acceptance flow
- [ ] Admin professional availability calendar
- [ ] Admin available-professional suggestions
- [ ] Admin notification for unassigned/failed bookings
- [ ] Partner subscription calendar and recurring visit workflow
- [ ] Assignment audit history across all actors
- [ ] End-to-end instant booking tests
- [ ] End-to-end scheduled booking tests
- [ ] End-to-end subscription replacement tests
- [ ] Concurrency tests for assignment and overlapping visits
- [ ] Contract tests for Admin frontend/backend payloads

## G. Recommended Implementation Plan

### Phase 1: Critical Backend and Assignment Logic

Likely modules:

- `application-module/.../dispatch/service`
- `application-module/.../partnerrequest/service`
- `application-module/.../subscription/service`
- `application-module/.../dispatch/repository`
- `application-module/.../subscription/repository`
- `application-module/.../dispatch/scheduler`
- Common booking and subscription status models

Work:

- Implement scheduled dispatch activation.
- Enforce skill/category eligibility uniformly.
- Add time-window conflict queries.
- Add duration and travel buffers.
- Unify assignment state transitions.
- Add idempotency and row locking to all assignment paths.

### Phase 2: Admin Professional Management and Dispatch

Likely files:

- `apps/admin/src/features/providers/api/providersApi.ts`
- `apps/admin/src/features/providers/pages/ProviderVerificationPage.tsx`
- `apps/admin/src/features/bookings/api/bookingsApi.ts`
- `apps/admin/src/features/bookings/pages/BookingDetailsPage.tsx`
- `apps/admin/src/features/subscriptions/api/subscriptionsApi.ts`
- `apps/admin/src/features/subscriptions/pages/SubscriptionDetailsPage.tsx`
- Backend Admin dispatch/subscription controllers

Work:

- Fix manual dispatch payload.
- Fix lifecycle payload.
- Add professional availability/calendar view.
- Add eligible-professional suggestions.
- Add explicit subscription review actions.
- Add unassigned booking dashboard and notifications.

### Phase 3: Partner App Assignment and Calendar

Likely files:

- `apps/partner/legacy-mobile/src/services/partnerService.ts`
- `apps/partner/legacy-mobile/src/screens/main/NewOrdersScreen.tsx`
- `apps/partner/legacy-mobile/src/screens/main/HomeScreen.tsx`
- `apps/partner/legacy-mobile/src/features/shift/shiftApi.ts`
- Partner booking/subscription screens

Work:

- Separate instant, scheduled, and subscription request presentation.
- Add partner calendar and recurring visit schedule.
- Provide clear accept/decline semantics per visit.
- Add assignment-change notifications.
- Add offline queue reconciliation with server-side idempotency.

### Phase 4: Subscription Lifecycle and Professional Replacement

Likely modules:

- `application-module/.../subscription/service`
- `application-module/.../subscription/entity`
- `application-module/.../subscription/repository`
- `application-module/.../subscription/controller`
- `apps/admin/src/features/subscriptions/pages/SubscriptionDetailsPage.tsx`
- `apps/customer/legacy-mobile/src/api/subscriptionApi.ts`

Work:

- Implement a dedicated Admin approval state machine.
- Assign a dedicated professional across future visits.
- Preserve completed visits during replacement.
- Cancel/release old future assignments.
- Redispatch future visits to a replacement.
- Define absence, rejection, pause, cancellation, and rescheduling behavior.
- Automatically redispatch after approved change requests.

### Phase 5: Testing, Concurrency, Notifications, and Production Validation

Likely areas:

- `application-module/src/test`
- Admin feature tests
- Customer API/screen tests
- Partner request/shift tests
- Notification module
- Flyway migration validation

Work:

- Add frontend/backend contract tests.
- Add concurrent acceptance tests.
- Add overlapping schedule tests.
- Add complete booking-flow integration tests.
- Add notification delivery/retry tests.
- Verify assignment audit logs.
- Validate migrations and rollback behavior.

## H. Final Conclusion

1. **Is Instant Booking professional assignment fully implemented?** No. Dispatch and acceptance work, but skill enforcement is bypassed and Admin manual dispatch is broken.
2. **Is Scheduled Booking professional assignment fully implemented?** No. Scheduling exists, but activation, overlap prevention, duration, and buffer enforcement are incomplete.
3. **Is Subscription Booking professional assignment fully implemented?** No. Per-visit dispatch exists, but approval, replacement, reassignment, and duplicate assignment paths are inconsistent.
4. **Can Admin manually assign and reassign professionals?** Partially. Subscription assignment/replacement APIs exist. Ordinary booking manual dispatch is incorrectly wired. Subscription replacement does not reliably migrate future visits.
5. **Can professionals accept or decline assignments?** Yes for generic dispatch requests. The separate base-subscription accept/decline path is incomplete and inconsistently used.
6. **Is professional availability enforced by the backend?** Partially. Approval, shift, online state, workload counter, location, radius, and ETA are checked. Scheduled conflicts are not.
7. **Is professional replacement supported for subscriptions?** Partially, but not safely. Replacement metadata is stored without complete future-visit migration.
8. **Top 10 missing or risky items:**

   1. Deferred scheduled bookings may not be dispatched.
   2. Instant dispatch bypasses service-skill validation.
   3. No scheduled overlap detection.
   4. No duration or travel-buffer enforcement.
   5. Broken Admin manual-dispatch payload.
   6. Broken Admin lifecycle payload.
   7. Duplicate subscription assignment mechanisms.
   8. Replacement does not migrate future visits.
   9. Professional-change approval does not trigger redispatch.
   10. Missing end-to-end concurrency, replacement, and notification validation.

**Final audit verdict:** Lexho has a substantial dispatch foundation, but the Professional Management and Assignment System should be classified as **PARTIALLY IMPLEMENTED and NOT PRODUCTION-READY** until the P0/P1 issues and subscription lifecycle gaps are resolved.
