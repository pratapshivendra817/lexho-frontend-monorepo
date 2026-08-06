# Razorpay Frontend Integration

Use this flow after the existing booking create API succeeds.

1. Read `bookingId` from the booking create response.
2. Create a backend Razorpay order:
   - `POST /api/payments/create-order`
   - `Authorization: Bearer <customer-token>`
   - `Idempotency-Key: booking-<bookingId>-<uuid>`
   - Body: `{ "bookingId": 78 }`
3. Open Razorpay Checkout using only backend response values:
   - `key: data.keyId`
   - `order_id: data.razorpayOrderId`
   - `amount: data.amountInPaise`
   - `currency: data.currency`
4. In Razorpay success handler, verify payment:
   - `POST /api/payments/verify`
   - Body: `{ razorpayOrderId, razorpayPaymentId, razorpaySignature }`
5. Show success UI only after `/api/payments/verify` succeeds.

Retry rules:
- If the same network request is retried automatically, reuse the same `Idempotency-Key`.
- If the user manually clicks Retry Payment, generate a new key.
- Do not calculate or modify amount on frontend. Use `amountInPaise` from backend.

Reference files:
- `paymentApi.js`
- `PaymentButton.jsx`

After integration, run a Razorpay Test Mode payment from the UI and verify the success flow.
