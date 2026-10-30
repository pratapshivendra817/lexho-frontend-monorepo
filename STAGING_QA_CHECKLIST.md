# Staging QA Checklist for Subscription Lifecycle Flow

## Status

Implementation is complete and validated in code. The remaining work is staging verification and signoff.

### Verified evidence

- Frontend admin regression:
  - Command: `cd /Users/shivendra/lexho-frontend-monorepo/apps/admin && npx vitest run tests/features/subscriptions-pages.test.tsx`
  - Result: 7/7 tests passed

- Backend lifecycle regression:
  - Command: `cd "C:\Users\shivendra\lexho-frontend-monorepo\output\subscription-backend"; & .\mvnw.cmd -pl application-module test -Dtest='ProfessionalChangeRequestServiceTest,PartnerDispatchControllerTest'`
  - Result: 12 tests run, 0 failures, 0 errors, BUILD SUCCESS

## Goal

Verify that the admin-controlled lifecycle works correctly end-to-end across admin, customer, and partner flows before production release.

## Pre-Deployment Checks

- [ ] App builds successfully in staging
- [ ] Required environment variables are present
- [ ] DB migration / seed data is applied
- [ ] Backend services are healthy
- [ ] Admin, customer, and partner apps are reachable

## Admin Smoke Test

- [ ] Open subscription detail page for a test subscription
- [ ] Confirm subscription is visible in the admin list
- [ ] Open the `Professional Change Requests` section
- [ ] Confirm request appears for the subscription
- [ ] Click `Approve`
- [ ] Confirm API call succeeds
- [ ] Confirm status is updated to `PENDING_PARTNER_ASSIGNMENT`
- [ ] Confirm no direct assignment is allowed before approval
- [ ] Reject flow: create a second request and click `Reject`
- [ ] Confirm request status changes to `REJECTED`
- [ ] Verify toast messages are displayed correctly

## Customer Smoke Test

- [ ] Log in as a customer with an active subscription
- [ ] Open subscription plan or subscription detail screen
- [ ] Confirm lifecycle messaging matches current status
- [ ] If status is blocked, verify no action button is enabled
- [ ] If status is actionable, verify the change-request CTA is shown only in valid states
- [ ] Submit a professional change request
- [ ] Confirm request is created successfully
- [ ] Confirm duplicate pending request is blocked
- [ ] Confirm customer sees the updated status text after admin approval or rejection

## Partner Smoke Test

- [ ] Open partner assignment flow for a subscription awaiting assignment
- [ ] Confirm assignment appears only after admin approval
- [ ] Accept the assignment
- [ ] Confirm subscription status moves to `CONFIRMED` or expected next state
- [ ] Decline the assignment
- [ ] Confirm subscription returns to `PENDING_PARTNER_ASSIGNMENT`
- [ ] Verify fallback partner service paths still work for legacy endpoints

## Data Integrity Checks

- [ ] New subscription status records are stored as expected values
- [ ] Professional change requests record `status`, `adminReason`, and timestamps correctly
- [ ] No stale `ACTIVE` / direct-dispatch path remains during review gate
- [ ] No duplicate pending professional change requests are persisted for a subscription

## Rollback and Signoff

- [ ] Save staging QA evidence and screenshots
- [ ] Confirm all pass items are checked
- [ ] If any fail item exists, fix before deployment
- [ ] Sign off build as ready for release only when all critical checks pass
- [ ] Prepare rollback plan for staging rollback if unexpected issues appear

## Final Signoff Gate

Release only if all of the following are true:

- [ ] Admin approval flow works end-to-end
- [ ] Customer contract view reflects correct status messaging
- [ ] Partner accept/decline flow works
- [ ] No critical regression in targeted test suite
- [ ] DB state and lifecycle transitions match expected business rules
