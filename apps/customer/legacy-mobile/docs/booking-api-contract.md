# Booking API Contract

## Create Booking

**Endpoint:** `POST /api/bookings/create`

**Auth:** `Authorization: Bearer <token>` (required)

### Request Payload

```json
{
  "serviceId": 123,
  "addressId": 45,
  "date": "2026-05-05",
  "slot": "11:00-13:00",
  "note": "optional"
}
```

### Validation Rules

- `date` is mandatory for slot-aware booking.
- `date` format must be `YYYY-MM-DD`.
- `slot` format must be `HH:mm-HH:mm` (24-hour), example: `09:00-11:00`.
- `serviceId` is required and must be positive.
- `addressId` is required and must be positive.

## Slots API

- Primary: `GET /api/customer/cart/slots?date=2026-05-05`
- Fallback: `GET /api/cart/slots?date=2026-05-05`

### Expected Slot Object Fields

- `label`
- `startTime`
- `endTime`
- `capacity`
- `booked`
- `remaining`
- `available`

### Expected Top-Level Response Fields

- `isEstimated`
- `timezone`
