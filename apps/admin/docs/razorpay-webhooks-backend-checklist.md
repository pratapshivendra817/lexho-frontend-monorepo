# Razorpay Webhooks Backend Checklist

Date: July 16, 2026

## Current frontend status

Admin Razorpay Webhooks UI is already present and wired in the admin app.

Routes:

- `/webhooks`
- `/webhooks/:id`

Frontend files:

- `apps/admin/src/features/operations/pages/WebhookEventsPage.tsx`
- `apps/admin/src/features/operations/pages/WebhookDetailPage.tsx`
- `apps/admin/src/features/operations/api/operationsApi.ts`

## Current backend concern

The admin app is currently receiving:

- `GET /api/v1/admin/razorpay/webhooks -> 404 Endpoint not found`

That strongly suggests the webhook admin routes are not implemented yet or not mounted on `http://localhost:8082`.

## Razorpay Webhooks endpoints required by admin frontend

### 1. List webhook events

`GET /api/v1/admin/razorpay/webhooks`

Query params:

- `search` optional
- `eventType` optional
- `status` optional

Example:

`GET /api/v1/admin/razorpay/webhooks?search=pay_123&eventType=payment.captured&status=SUCCESS`

### 2. Webhook event detail

`GET /api/v1/admin/razorpay/webhooks/{id}`

Example:

`GET /api/v1/admin/razorpay/webhooks/webhook-123`

## Response fields expected by frontend

The admin frontend currently reads these fields for list items:

- `id` or fallback `eventId` or `webhookEventId`
- `eventType` or fallback `type`
- `paymentId` or fallback `razorpayPaymentId`
- `status` or fallback `processingStatus`
- `processedAt` or fallback `updatedAt`
- `retryCount` or fallback `retries`
- `requestId`
- `correlationId`

For detail API it also reads:

- `payload` or fallback `eventPayload`
- `errorMessage` or fallback `error`
- `retryStatus`
- `history` or fallback `processingHistory`

Each processing-history row can contain:

- `id`
- `status`
- `message` or fallback `errorMessage`
- `processedAt` or fallback `createdAt`

## Suggested list response shape

```json
{
  "data": {
    "content": [
      {
        "id": "webhook-123",
        "eventType": "payment.captured",
        "paymentId": "pay_ABC123",
        "status": "SUCCESS",
        "processedAt": "2026-07-16T12:30:00Z",
        "retryCount": 0,
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
    "id": "webhook-123",
    "eventType": "payment.captured",
    "paymentId": "pay_ABC123",
    "status": "SUCCESS",
    "processedAt": "2026-07-16T12:30:00Z",
    "retryCount": 0,
    "requestId": "req-123",
    "correlationId": "corr-123",
    "payload": {
      "entity": "event"
    },
    "errorMessage": null,
    "retryStatus": "NOT_REQUIRED",
    "history": [
      {
        "id": "hist-1",
        "status": "SUCCESS",
        "message": "Processed successfully",
        "processedAt": "2026-07-16T12:30:01Z"
      }
    ]
  }
}
```

## Backend behavior checklist

- Add and register:
  - `GET /api/v1/admin/razorpay/webhooks`
  - `GET /api/v1/admin/razorpay/webhooks/{id}`
- Ensure admin auth works on these routes.
- Support filtering by:
  - `search`
  - `eventType`
  - `status`
- Return `404` only for a missing detail record, not for the whole feature route.
- Include `requestId` and `correlationId` for traceability.
- Return raw or structured `payload` for detail inspection.
- Return processing `history` for debugging retries and failures.

## Short message for backend team

```text
Admin Razorpay Webhooks frontend is ready, but backend is currently returning:
- GET /api/v1/admin/razorpay/webhooks -> 404 Endpoint not found

Please implement and register:
- GET /api/v1/admin/razorpay/webhooks
- GET /api/v1/admin/razorpay/webhooks/{id}

Frontend expects fields like:
id/eventId/webhookEventId, eventType/type, paymentId/razorpayPaymentId, status/processingStatus, processedAt/updatedAt, retryCount/retries, requestId, correlationId.

Detail API should also return:
payload/eventPayload, errorMessage/error, retryStatus, history/processingHistory.
```
