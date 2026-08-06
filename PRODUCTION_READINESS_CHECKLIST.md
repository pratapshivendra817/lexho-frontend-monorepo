# Lexho Frontend Production Readiness Checklist

Last updated: July 19, 2026

This file captures the current frontend production-readiness state for:

- `apps/admin`
- `apps/partner/legacy-mobile`
- `apps/customer/legacy-mobile`

It is based on the current repo state and local verification completed in this workspace.

## Overall Status

### Admin

Status: Frontend mostly production-ready

What is verified:

- Environment config now safely falls back for invalid `VITE_APP_ENV`
- Admin shell push bootstrap is non-blocking
- Browser push setup no longer forces permission popups during shell load
- Notification websocket URL is production-safe and no longer depends on localhost fallback
- Debug `console.log` noise removed from the notification and serviceable-area paths
- Vendor chunk splitting added to reduce initial admin bundle size
- Map styles localized to map-enabled surfaces instead of global app shell load

Verification completed:

- `npm run build --workspace=@lexho/admin`
- Targeted Vitest suites passed: `45/45`

Remaining admin note:

- `vendor-maps` chunk is still large because of Mapbox, but it is now isolated and no longer bloats the main shell bundle

### Partner

Status: Frontend stronger and near production-ready

What is verified:

- Partner API now supports explicit `API_BASE_URL` config
- FCM device registration is aligned with shared backend contract
- Partner push now uses `/api/notifications/devices`
- Partner push payload includes `appType: "PARTNER"`
- Old partner-only device-token endpoint references removed from active code path
- Dev OTP console output removed from auth screens
- Warnings screen and warning notification integration remain intact

Verification completed:

- Targeted Jest suites passed: `37/37`

Remaining partner note:

- Push contract is frontend-aligned, but a fresh Android rebuild/install and real-device token registration should still be rechecked in release-like conditions

### Customer

Status: Frontend mostly ready, but full release sign-off is blocked

What is verified:

- Customer app now supports explicit `API_BASE_URL` config
- Legacy profile service no longer silently falls back to `http://localhost:8082`
- Env typings and sample env updated for release-safe configuration
- Existing customer push registration path already uses `/api/notifications/devices`
- SSL pinning code scaffold is present and wired

Verification completed:

- `npm test -- --runInBand __tests__/profileService.test.js __tests__/authApi.test.ts`
- Targeted Jest suites passed: `49/49`

Current customer blocker:

- SSL pinning is not release-ready yet because the certificate file is missing:
  - `apps/customer/legacy-mobile/android/app/src/main/assets/certs/lexho_api.cer`
- Verification command result:
  - `npm run android:verify:ssl`
  - Result: certificate missing

Do not enable:

- `SSL_PINNING_ENABLED=true`

until the certificate file is added and verification passes.

## Required Backend / DevOps Inputs

### Shared

- Confirm production backend base URLs for Admin, Partner, and Customer environments
- Confirm production Firebase project and service account alignment for push delivery
- Confirm `/api/notifications/devices` is the supported device registration endpoint for mobile apps

### Admin

- Production `.env` values for admin web push and API
- Valid Firebase web config:
  - API key
  - auth domain
  - project ID
  - sender ID
  - app ID
  - VAPID key
- Production Mapbox token if live-dispatch and geo tools are used in production

### Partner

- Production `API_BASE_URL`
- Real-device FCM verification after release build install
- Backend confirmation that partner target IDs map correctly to active device tokens

### Customer

- Production `API_BASE_URL`
- Production SSL certificate export in `.cer` form
- Add certificate here:
  - `apps/customer/legacy-mobile/android/app/src/main/assets/certs/lexho_api.cer`
- Only then enable:
  - `SSL_PINNING_ENABLED=true`
  - `SSL_PINNING_CERT_NAME=lexho_api`

## Recommended Release Order

1. Finalize Admin production env
2. Rebuild and smoke-test Partner push on a real Android device
3. Add Customer SSL certificate and rerun SSL verification
4. Do one final end-to-end smoke pass across all three apps

## Quick Commands

### Admin

- `npm run build --workspace=@lexho/admin`
- `npm run test --workspace=@lexho/admin -- tests/app/config.test.ts tests/app/App.test.tsx tests/services/adminPushNotifications.test.ts tests/features/notifications-socket-hook.test.tsx tests/features/notifications-api-hooks.test.ts tests/features/serviceable-areas-api.test.ts`

### Partner

- `npm test --prefix apps/partner/legacy-mobile -- --runInBand src/services/notificationsService.test.ts __tests__/partnerApiAndAnalytics.test.ts`

### Customer

- `npm test --prefix apps/customer/legacy-mobile -- --runInBand __tests__/profileService.test.js __tests__/authApi.test.ts`
- `npm run android:verify:ssl --prefix apps/customer/legacy-mobile`

## Bottom Line

- Admin frontend: ready for production env handoff
- Partner frontend: ready for final device-level push validation
- Customer frontend: blocked only on SSL certificate asset before full release-hardening sign-off
