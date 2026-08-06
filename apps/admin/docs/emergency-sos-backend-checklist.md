# Emergency SOS Backend Checklist

Date: July 16, 2026

## Current frontend status

Admin Emergency SOS UI is already present and wired in the admin app.

Routes:

- `/emergency-sos`
- `/emergency-sos/:eventId`

Frontend files:

- `apps/admin/src/features/emergency-sos/pages/EmergencyIncidentsPage.tsx`
- `apps/admin/src/features/emergency-sos/pages/EmergencyIncidentDetailsPage.tsx`
- `apps/admin/src/features/emergency-sos/api/emergencySosApi.ts`

## Current backend concern

The admin app is receiving `404 Endpoint not found` for multiple `/api/v1/admin/*` routes on `http://localhost:8082`, for example:

- `GET /api/v1/admin/razorpay/webhooks`
- `GET /api/v1/admin/audit-logs`

Because of that pattern, there is a strong chance the Emergency SOS admin routes are also not implemented or not mounted yet.

## Emergency SOS endpoints required by admin frontend

### 1. List incidents

`GET /api/v1/admin/emergency/incidents`

Query params:

- `page`
- `limit`
- `status` optional
- `partnerId` optional

Example:

`GET /api/v1/admin/emergency/incidents?page=1&limit=20&status=TRIGGERED&partnerId=123`

### 2. Incident detail

`GET /api/v1/admin/emergency/incidents/{eventId}`

Example:

`GET /api/v1/admin/emergency/incidents/evt-123`

### 3. Acknowledge incident

`PATCH /api/v1/admin/emergency/incidents/{eventId}/acknowledge`

Request body:

```json
{
  "note": "Ops team contacted partner and is monitoring the case."
}
```

### 4. Resolve incident

`PATCH /api/v1/admin/emergency/incidents/{eventId}/resolve`

Request body:

```json
{
  "note": "Partner confirmed safe. Incident closed."
}
```

## Response fields expected by frontend

The admin frontend currently reads these fields from list/detail responses:

- `eventId` or fallback `id`
- `partnerId` or `partner.id`
- `partnerName` or `partner.name`
- `partnerPhone` or `partner.phone`
- `status`
- `latitude` or `location.latitude`
- `longitude` or `location.longitude`
- `accuracyMeters` or `accuracy` or `location.accuracyMeters`
- `address` or `location.address`
- `message`
- `createdAt` or `triggeredAt`
- `acknowledgedAt`
- `acknowledgedBy`
- `resolvedAt`
- `resolvedBy`
- `acknowledgementNote` or `acknowledgeNote`
- `resolutionNote` or `resolveNote`
- `requestId`
- `correlationId`

## Expected status values

Frontend expects these statuses:

- `TRIGGERED`
- `ACKNOWLEDGED`
- `RESOLVED`

Case-insensitive backend values are fine because frontend normalizes to uppercase.

## Suggested list response shape

```json
{
  "data": {
    "content": [
      {
        "eventId": "evt-123",
        "partnerId": 45,
        "partnerName": "Ravi Kumar",
        "partnerPhone": "9999999999",
        "status": "TRIGGERED",
        "latitude": 28.6139,
        "longitude": 77.209,
        "accuracyMeters": 12,
        "address": "Connaught Place, New Delhi",
        "message": "Unsafe situation",
        "createdAt": "2026-07-16T12:30:00Z",
        "requestId": "req-123",
        "correlationId": "corr-123"
      }
    ],
    "page": 1,
    "limit": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

## Suggested detail response shape

```json
{
  "data": {
    "eventId": "evt-123",
    "partnerId": 45,
    "partnerName": "Ravi Kumar",
    "partnerPhone": "9999999999",
    "status": "ACKNOWLEDGED",
    "latitude": 28.6139,
    "longitude": 77.209,
    "accuracyMeters": 12,
    "address": "Connaught Place, New Delhi",
    "message": "Unsafe situation",
    "createdAt": "2026-07-16T12:30:00Z",
    "acknowledgedAt": "2026-07-16T12:34:00Z",
    "acknowledgedBy": "admin@lexho.com",
    "resolvedAt": null,
    "resolvedBy": null,
    "acknowledgementNote": "Ops team contacted partner and is monitoring the case.",
    "resolutionNote": null,
    "requestId": "req-123",
    "correlationId": "corr-123"
  }
}
```

## Backend behavior checklist

- Add and register all 4 `/api/v1/admin/emergency/incidents*` routes.
- Ensure admin auth works on these routes.
- Return `404` only when a specific incident does not exist, not when the module itself is missing.
- Persist admin note on acknowledge/resolve.
- Persist actor and timestamps for acknowledge/resolve.
- Keep `eventId` stable across list and detail APIs.
- Support filtering by `status` and `partnerId`.
- Return location fields whenever available.
- Return `requestId` and `correlationId` for debugging.

## Push notification deep-link support

Admin push routing already supports Emergency SOS deep links.

If backend sends admin push notifications for SOS, send:

- `redirectType`: `EMERGENCY_SOS` or `EMERGENCY` or `SOS`
- incident id in one of:
  - `redirectValue`
  - `referenceId`
  - `eventId`

That opens:

- `/emergency-sos/{eventId}`

## Short message for backend team

```text
Admin Emergency SOS frontend is ready, but backend admin routes need to exist and be mounted on localhost:8082.

Please implement and register:
- GET /api/v1/admin/emergency/incidents
- GET /api/v1/admin/emergency/incidents/{eventId}
- PATCH /api/v1/admin/emergency/incidents/{eventId}/acknowledge
- PATCH /api/v1/admin/emergency/incidents/{eventId}/resolve

Current frontend evidence already shows 404 Endpoint not found on other /api/v1/admin/* APIs such as:
- /api/v1/admin/razorpay/webhooks
- /api/v1/admin/audit-logs

So this currently looks like missing or unmounted admin backend routes, not a UI-only issue.
```
