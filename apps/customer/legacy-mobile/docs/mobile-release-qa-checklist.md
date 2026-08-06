# Customer Mobile Release QA Checklist

## Security

- Verify `SSL_PINNING_ENABLED=true` in release env
- Confirm `lexho_api.cer` exists in Android assets and iOS bundle
- Run `npm run android:verify:ssl` before Android release packaging
- Confirm API calls succeed with valid production certificate
- Confirm API calls fail when pin validation is intentionally broken

## Auth

- Login succeeds
- 401 refreshes token through `/api/v1/auth/refresh`
- Legacy `/api/auth/refresh` fallback works if enabled in lower env
- Logout clears session and push registration state

## Offline

- Disable internet before booking create
- Confirm booking request is queued instead of lost
- Re-enable internet and confirm queued booking retries
- Repeat for cancel, reschedule, and profile update
- Confirm offline banner appears and disappears correctly

## Notifications

- Foreground notification shows in-app banner
- Background notification opens the expected screen
- Terminated app notification opens the expected screen
- `notification_received` and `notification_clicked` appear in analytics

## Payments

- Payment started event fires
- Payment success event fires
- Payment failure event fires
- Refund request and refund completed events fire
- Payment recovery on app reopen navigates correctly

## Tracking

- Live tracking opens from booking flow
- Partner map updates render correctly
- `track_partner_clicked` fires on map handoff
- `live_tracking_opened` fires once per screen open

## Cache

- Booking history loads from cache when backend is unavailable
- Booking detail loads from cache when backend is unavailable
- Categories and service/provider lists remain available after a cold relaunch offline
