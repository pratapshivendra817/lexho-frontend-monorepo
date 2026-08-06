# Customer Android Firebase Guide

## Configured Features

- Firebase app config: `android/app/google-services.json`
- Gradle plugins: Google Services and Crashlytics
- FCM token registration: `/api/notifications/devices`
- Android 13+ notification permission: `POST_NOTIFICATIONS`
- Notification channels:
  - `lexho_customer_default`
  - `lexho_customer_bookings`
- Foreground push UI: in-app snackbar
- Background/terminated push open routing: booking, payment, tracking, support and notifications routes
- Firebase Analytics wrappers:
  - `trackAnalyticsEvent`
  - `setAnalyticsUser`
  - `trackScreenView`
- Firebase Crashlytics wrappers:
  - `recordNonFatalError`
  - `logCrashlyticsMessage`
  - `setCrashlyticsUser`

## Local Android Smoke Test

1. Confirm `android/app/google-services.json` belongs to package `com.lexhocustomer`.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Run Android:
   ```sh
   npm run android:run:shortpath
   ```
4. Login with OTP.
5. Check Metro logs for:
   - `[push:init:fcm-token]`
   - `[push:register:success]`
6. Confirm backend receives:
   ```json
   {
     "deviceId": "...",
     "fcmToken": "...",
     "platform": "android",
     "appType": "customer"
   }
   ```

## Push Notification Test

1. Send a test push from Firebase Console or backend.
2. Foreground app:
   - Snackbar should appear.
   - Notifications query should refresh.
3. Background app:
   - Tapping notification should route based on `redirectType`.
4. Terminated app:
   - Tapping notification should open the app and route using `getInitialNotification`.

Useful data payload examples:

```json
{
  "redirectType": "BOOKING_DETAIL",
  "bookingId": "123"
}
```

```json
{
  "redirectType": "PAYMENT",
  "bookingId": "123"
}
```

## Analytics Test

After login, Firebase Analytics should receive:

- `login_success`
- `customer_session_active`
- `fcm_token_registered`
- `push_foreground_received`
- `push_background_received`
- `push_opened`
- `location_*` events from location flows

Analytics events may take time to appear in Firebase Console. Use DebugView for faster validation.

## Crashlytics Test

Non-fatal errors are logged from:

- Root render error boundary
- Push initialization/listener setup failures
- Token refresh registration failures
- Location failure events

For release verification:

1. Build release APK/AAB.
2. Confirm Crashlytics Gradle task runs.
3. Trigger or record a non-fatal error in a test build.
4. Confirm the non-fatal appears in Firebase Crashlytics.

## Release Notes

- `mappingFileUploadEnabled true` is enabled for release builds.
- Production release should replace debug signing with a real upload/release keystore.
- Keep `google-services.json` aligned with the final Firebase Android app package.
