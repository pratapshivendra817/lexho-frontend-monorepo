# Audit Logs Backend Checklist

Date: July 16, 2026

## Current frontend status

Admin Audit Logs UI is already present and wired in the admin app.

Routes:

- `/audit-logs`
- `/audit-logs/:id`

Frontend files:

- `apps/admin/src/features/operations/pages/AuditLogsPage.tsx`
- `apps/admin/src/features/operations/pages/AuditDetailPage.tsx`
- `apps/admin/src/features/operations/api/operationsApi.ts`

## Current backend concern

The admin app is currently receiving:

- `GET /api/v1/admin/audit-logs -> 404 Endpoint not found`

That strongly suggests the audit logs admin routes are not implemented yet or not mounted on `http://localhost:8082`.

## Audit Logs endpoints required by admin frontend

### 1. List audit logs

`GET /api/v1/admin/audit-logs`

Query params:

- `startDate` optional
- `endDate` optional
- `action` optional
- `user` optional
- `role` optional

Example:

`GET /api/v1/admin/audit-logs?startDate=2026-07-01&endDate=2026-07-16&action=LOGIN&user=admin@lexho.com&role=ADMIN`

### 2. Audit log detail

`GET /api/v1/admin/audit-logs/{id}`

Example:

`GET /api/v1/admin/audit-logs/audit-123`

## Response fields expected by frontend

The admin frontend currently reads these fields for list items:

- `id` or fallback `auditId`
- `date` or fallback `createdAt` or `timestamp`
- `user` or fallback `adminName` or `username`
- `role`
- `action`
- `entityType` or fallback `module`
- `entityId` or fallback `referenceId`
- `requestId`
- `correlationId`

For detail API it also reads:

- `oldValue`
- `newValue`
- `changeHistory` or fallback `changes`

Each change-history row can contain:

- `id`
- `field`
- `oldValue`
- `newValue`
- `changedAt` or fallback `createdAt`

## Suggested list response shape

```json
{
  "data": {
    "content": [
      {
        "id": "audit-123",
        "date": "2026-07-16T12:30:00Z",
        "user": "admin@lexho.com",
        "role": "ADMIN",
        "action": "BOOKING_UPDATED",
        "entityType": "BOOKING",
        "entityId": "booking-99",
        "requestId": "req-123",
        "correlationId": "corr-123"
      }
    ]
  }
}
```

## Suggested detail response shape

```json
{
  "data": {
    "id": "audit-123",
    "date": "2026-07-16T12:30:00Z",
    "user": "admin@lexho.com",
    "role": "ADMIN",
    "action": "BOOKING_UPDATED",
    "entityType": "BOOKING",
    "entityId": "booking-99",
    "requestId": "req-123",
    "correlationId": "corr-123",
    "oldValue": {
      "status": "CREATED"
    },
    "newValue": {
      "status": "PARTNER_ASSIGNED"
    },
    "changeHistory": [
      {
        "id": "chg-1",
        "field": "status",
        "oldValue": "CREATED",
        "newValue": "PARTNER_ASSIGNED",
        "changedAt": "2026-07-16T12:30:00Z"
      }
    ]
  }
}
```

## Backend behavior checklist

- Add and register:
  - `GET /api/v1/admin/audit-logs`
  - `GET /api/v1/admin/audit-logs/{id}`
- Ensure admin auth works on these routes.
- Support filtering by:
  - `startDate`
  - `endDate`
  - `action`
  - `user`
  - `role`
- Return `404` only for a missing detail record, not for the entire feature route.
- Include `requestId` and `correlationId` for traceability.
- Return `oldValue`, `newValue`, and `changeHistory` on detail API.

## Short message for backend team

```text
Admin Audit Logs frontend is ready, but backend is currently returning:
- GET /api/v1/admin/audit-logs -> 404 Endpoint not found

Please implement and register:
- GET /api/v1/admin/audit-logs
- GET /api/v1/admin/audit-logs/{id}

Frontend expects fields like:
id/auditId, date/createdAt/timestamp, user/adminName/username, role, action, entityType/module, entityId/referenceId, requestId, correlationId.

Detail API should also return:
oldValue, newValue, changeHistory/changes.
```
