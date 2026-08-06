# Customer App Platform Services

## What was added

- Firebase analytics screen tracking wired from `App.tsx` through `screenTrackingService.ts`
- Crashlytics bootstrap with global JS error and unhandled promise rejection capture
- Offline detection with `networkService.ts`
- AsyncStorage-backed retry queue in `offlineQueue.ts`
- AsyncStorage-backed stale cache in `cacheManager.ts`
- Redux infra slices:
  - `analyticsSlice`
  - `notificationSlice`
  - `trackingSlice`
  - `offlineSlice`
- Live tracking Redux sync from `LiveTrackingScreen.tsx`
- Notification event normalization for `notification_received` and `notification_clicked`
- JWT refresh fallback from `/api/v1/auth/refresh` to legacy `/api/auth/refresh`
- SSL pinning scaffold in `services/security/sslApiClient.ts`

## Queue coverage

Queued automatically when network is unavailable:

- booking create
- booking cancel
- booking reschedule
- profile update

Queued actions are retried automatically when connectivity returns.

## Cache coverage

Cached in AsyncStorage with stale-window checks:

- booking history
- booking details
- service categories
- recommended services
- quick services
- category service/provider lists

## Remaining native step

`sslApiClient.ts` is production-wired with runtime fallback, but full certificate pinning requires the native `react-native-ssl-pinning` package plus bundled certs such as `lexho_api.cer`.
