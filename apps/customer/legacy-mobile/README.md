This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.

## Customer Platform Docs

- `docs/customer-app-platform-services.md`
- `docs/ssl-pinning-setup.md`
- `docs/mobile-release-qa-checklist.md`

## Backend-Driven Booking Flow

The customer app booking flow follows the frozen backend contract. The frontend acts only as a renderer of backend state.

### Single Source Of Truth

Backend controls:
- Tracking screen
- Map visibility
- Polling interval
- Booking action permissions
- Subscription action permissions
- Timeline
- Payment retry behavior

Frontend responsibilities:
- Render UI
- Call APIs
- Display backend data

Frontend must not infer business rules from `booking.status` or `booking.assignmentStatus`.

### Booking Details Contract

Use:

```text
GET /api/bookings/details/{bookingId}
```

Every booking response should include:

```json
{
  "contractVersion": 1,
  "statusHistory": [],
  "meta": {
    "trackingScreen": "INSTANT_STATUS",
    "showMap": false,
    "trackingRefreshSeconds": 15,
    "canCancel": true,
    "canReschedule": false,
    "canCallPartner": false,
    "canTrackPartner": false,
    "canRaiseIssue": false
  }
}
```

### Tracking Screen Router

Open screens using only:

```js
booking.meta.trackingScreen
```

Supported values:

```text
INSTANT_STATUS
LIVE_TRACKING
PARTNER_ARRIVED
SERVICE_STARTED
SERVICE_IN_PROGRESS
SERVICE_COMPLETED
SCHEDULED_STATUS
SUBSCRIPTION_DETAILS
```

Unknown values must open `BookingStatusFallback`.

### Dynamic Polling

Use:

```js
booking.meta.trackingRefreshSeconds
```

Rules:
- `15` means poll every 15 seconds.
- `5` means poll every 5 seconds.
- `30` means poll every 30 seconds.
- `0` means stop polling.

No hardcoded polling intervals should be used for booking lifecycle.

### Dynamic Permissions

Render actions only from backend permissions:

```js
booking.meta.canCancel
booking.meta.canReschedule
booking.meta.canCallPartner
booking.meta.canTrackPartner
booking.meta.canRaiseIssue
```

Example:

```jsx
{booking.meta.canCancel && <CancelButton />}
```

Do not derive action availability from booking status.

### Mapbox Rules

Load Mapbox only when:

```js
booking.meta.showMap === true &&
booking.map?.enabled === true
```

Partner coordinates must be read only from:

```js
booking.map.partner.latitude
booking.map.partner.longitude
```

Do not use root coordinate fields such as `partnerLatitude`, `partnerLongitude`, `customerLatitude`, or `customerLongitude`.

### Timeline

Render timeline from:

```js
booking.statusHistory
```

Do not hardcode timeline states on the frontend.

### Payment Failure And Retry

Supported failure codes/statuses:

```text
FAILED
EXPIRED
PAYMENT_FAILED
PAYMENT_EXPIRED
```

Show retry only when:

```js
booking.retryPaymentAllowed === true
```

Retry endpoint:

```text
POST /api/payments/retry
```

### Subscription Module

Subscription screens must use only subscription APIs:

```text
GET  /api/subscriptions
GET  /api/subscriptions/{id}
GET  /api/subscriptions/{id}/visits
POST /api/subscriptions/{id}/pause
POST /api/subscriptions/{id}/resume
POST /api/subscriptions/{id}/cancel
```

Do not use booking tracking APIs for subscription screens.

Render visit sections from backend response:

```text
upcomingVisits
completedVisits
cancelledVisits
```

Subscription actions must use:

```js
subscription.canPause
subscription.canResume
subscription.canCancel
```

### My Bookings History

Use:

```text
GET /api/bookings/history?page=1&size=20
```

Render grouped backend sections directly:

```js
instantBookings
scheduledBookings
subscriptions
```

Do not merge subscription cards into regular booking lists.

Support pagination with:

```js
items
page
size
hasMore
```

### Error Handling

Use backend machine-readable codes:

```js
error.code
```

Common codes:

```text
BOOKING_NOT_FOUND
PAYMENT_FAILED
PAYMENT_EXPIRED
SUBSCRIPTION_PAUSED
SUBSCRIPTION_CANCELLED
PARTNER_UNAVAILABLE
TRACKING_DISABLED
INVALID_REQUEST
INTERNAL_ERROR
```

Do not parse message strings for business decisions.
