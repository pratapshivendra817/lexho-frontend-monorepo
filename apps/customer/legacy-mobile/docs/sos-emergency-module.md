# SOS Emergency Module

Authenticated customer and partner sessions display a floating SOS control. A three-second long press opens confirmation; confirmation captures fresh high-accuracy GPS, posts an `ACTIVATE` event, and starts location updates while the SOS screen remains active.

## API contract

- `POST /api/v1/{customer|partner}/sos` with `{ eventId, eventType, location, createdAt }`
- `GET /api/v1/{customer|partner}/emergency-contacts`
- `POST /api/v1/{customer|partner}/emergency-contacts`
- `DELETE /api/v1/{customer|partner}/emergency-contacts/{id}`

The backend should treat `eventId` as idempotent, notify emergency contacts, retain the latest location, and escalate `ACTIVATE` immediately. Offline events are capped at 100 per app and retried in order when connectivity returns.

The platform emergency number defaults to `112` and opens the native phone dialer after an explicit tap.
