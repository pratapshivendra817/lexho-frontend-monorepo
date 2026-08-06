const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";

async function parseJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "Payment request failed");
  }
  return payload?.data && typeof payload.data === "object" ? payload.data : payload;
}

export function createPaymentAttemptKey(bookingId) {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}`;
  return `booking-${bookingId}-${uuid}`;
}

export async function createPaymentOrder({ bookingId, token, idempotencyKey }) {
  const response = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ bookingId: Number(bookingId) }),
  });

  return parseJsonResponse(response);
}

export async function verifyPayment({ token, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const response = await fetch(`${API_BASE_URL}/api/payments/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    }),
  });

  return parseJsonResponse(response);
}

export async function getPaymentStatus({ bookingId, token }) {
  const response = await fetch(`${API_BASE_URL}/api/payments/${bookingId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseJsonResponse(response);
}
