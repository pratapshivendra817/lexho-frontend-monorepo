# Admin-Backend Parity Sign-off Checklist (Customer App)

This checklist is for backend + admin owners to confirm customer app contracts are production-safe.

## 1) Auth
### POST /otp/send
- Request required fields:
  - `mobile: string` (10 digits, numeric)
- Response expected (any one format accepted currently):
  - `success?: boolean`
  - `message?: string`
  - `resendAfter?: number`
  - optional dev-only `otp/code`
- Validation to confirm:
  - rate-limit behavior and error code
  - `resendAfter` unit = seconds

### POST /otp/verify
- Request:
  - `mobile: string`
  - `otp: string`
- Response required:
  - `token: string`
  - `refreshToken?: string`
  - `user?: { id, mobile, name?, email?, avatar? }`
- Validation:
  - error shape for wrong OTP and expired OTP

### POST /auth/refresh-token
- Request:
  - `refreshToken: string`
- Response:
  - `token: string`
  - `refreshToken?: string`

### POST /auth/logout
- No strict response dependency; success status enough.

## 2) Home + Discovery
### GET /api/home/dashboard
- Expected fields used:
  - `greeting?: string`
  - `location?: string`
  - `recentBookings?: BookingSummary[]`

### GET /api/banners
- Expected banner item:
  - `id: string`
  - `title?: string`
  - `imageUrl?: string`
  - `redirectUrl?: string`
  - `promoCode?: string`

### GET /api/categories
- Expected category item:
  - `id: string`
  - `name: string`
  - `icon?: string`
  - `imageUrl?: string`

### GET /api/services/popular
### GET /api/services/recommended
### GET /api/services/quick
### GET /api/search/services?keyword=
- Expected service item:
  - `id: string`
  - `name: string`
  - `categoryId?: string`
  - `description?: string`
  - `price?: number`
  - `durationMinutes?: number`
  - `imageUrl?: string`
- Confirm search supports partial keyword.

## 3) Profile
### GET /api/user/profile
- Expected:
  - `id: string`
  - `mobile: string`
  - `name?: string`
  - `email?: string`
  - `avatar?: string`

### PUT /api/user/profile/update
- Current request from app:
  - `name?: string`
  - `email?: string`
- Confirm backend accepts partial updates.

### POST /api/user/profile/upload-image
- Not wired in UI yet.
- Confirm contract now for future:
  - multipart key name
  - response avatar URL field name.

## 4) Address
### POST /api/address/add
- Request:
  - `label: string`
  - `line1: string`
  - `city: string`

### GET /api/address/list
- Item expected:
  - `id: string`
  - `label: string`
  - `line1: string`
  - `city: string`
  - `isDefault?: boolean`

### PUT /api/address/update
- Request:
  - `id: string`
  - `label?: string`
  - `line1?: string`
  - `city?: string`

### DELETE /api/address/delete
- Request body:
  - `id: string`

### PUT /api/address/default
- Request:
  - `id: string`

## 5) Cart
### POST /api/cart/add
- Request:
  - `serviceId: string`
  - `quantity: number`

### GET /api/cart
- Item expected:
  - `id: string`
  - `serviceId: string`
  - `name?: string`
  - `quantity: number`
  - `price?: number`

### PUT /api/cart/update
- Request:
  - `id: string`
  - `quantity: number`

### DELETE /api/cart/remove
- Request body:
  - `id: string`

## 6) Booking
### POST /api/bookings/create
- Expected request target shape:
  - `serviceId: string`
  - `addressId: string`
  - `slot?: string`
  - `note?: string`

### GET /api/bookings/history
- Item minimum fields:
  - `id: string`
  - `status?: string`
  - `serviceName?: string`
  - `createdAt?: string`

### GET /api/bookings/details/{id}
### PUT /api/bookings/cancel/{id}
### PUT /api/bookings/reschedule/{id}
- Reschedule request currently:
  - `date: string` (ISO)
- Confirm accepted field names (`date` vs `scheduledAt`).

## 7) Live Tracking
### GET /api/partner/live-location/{bookingId}
- Expected:
  - `lat?: number`
  - `lng?: number`
  - `eta?: string`

## 8) Payments
### POST /api/payments/create-order
- Request:
  - Header: `Idempotency-Key: booking-<bookingId>-<unique-attempt-id>`
  - `bookingId: number`
- Expected:
  - `keyId: string`
  - `razorpayOrderId: string`
  - `amountInPaise: number`
  - `currency: string`

### POST /api/payments/verify
- Request:
  - `razorpayOrderId: string`
  - `razorpayPaymentId: string`
  - `razorpaySignature: string`
- Success response gates customer success/confirmation navigation.

### GET /api/payments/{bookingId}
- Confirm status enum and user-facing message field.

### GET/POST /api/payments/options
- Runtime uses this for displaying available methods.
- Fallback endpoint also tried:
  - `GET /api/payment/options`

### POST /api/payments/refund
- Request:
  - `bookingId: string`
  - `amount: number`

## 9) Coupon
### POST /api/coupon/apply
- Request:
  - `code: string`

### GET /api/coupon/list
- Item expected:
  - `id?: string`
  - `code: string`
  - `description?: string`
  - `discount?: number`

## 10) Reviews
### POST /api/reviews/add
- Request:
  - `serviceId: string`
  - `rating: number`
  - `comment: string`
  - `imageUrls?: string[]`

### GET /api/reviews/service/{id}
- Item expected:
  - `id: string`
  - `rating: number`
  - `comment: string`
  - `serviceName?: string`
  - `createdAt?: string`

## 11) Favorites
### POST /api/favorites/add
- Request:
  - `serviceId: string`

### GET /api/favorites/list
- Item expected:
  - `id: string`
  - `serviceId: string`
  - `name?: string`

### DELETE /api/favorites/remove
- Request body:
  - `id: string`

## 12) Notifications
### GET /api/notifications
- Item expected:
  - `id: string`
  - `title: string`
  - `message: string`
  - `read?: boolean`
  - `createdAt?: string`

### PUT /api/notifications/read
- Request:
  - `id: string`

### GET /api/customer/notifications/unread-count
- Response count field accepted:
  - `count` or `data.count`

## 13) Referral
### POST /api/referral/generate
- Response should include generated code field.

### POST /api/referral/apply
- Request:
  - `code: string`

## 14) Support
### POST /api/support/create
- Request:
  - `subject: string`
  - `message: string`

### GET /api/support/history
- Item expected:
  - `id: string`
  - `subject: string`
  - `message: string`
  - `status?: string`
  - `createdAt?: string`

---

## Cross-App (Admin + Customer) Mandatory Alignment
- Booking status enum exact values must match admin transition rules.
- Payment status enum values must match admin payment dashboard labels.
- ID ownership checks: backend must enforce customer can only access own booking/cart/address.
- List response format standardization recommended:
  - prefer `data: []` for lists and `data: {}` for objects
  - or provide API gateway normalizer.
- Error schema standardization recommended:
  - `{ message: string, code?: string, details?: any }`

## Sign-off table
- Backend Owner: ________ Date: ________
- Admin Owner: ________ Date: ________
- Customer App Owner: ________ Date: ________

