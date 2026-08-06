import React, { useRef, useState } from "react";
import { createPaymentAttemptKey, createPaymentOrder, verifyPayment } from "./paymentApi";

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Unable to load Razorpay Checkout"));
    document.body.appendChild(script);
  });
}

export default function PaymentButton({ bookingId, token, customer, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const attemptKeyRef = useRef(null);

  async function startPayment({ freshAttempt }) {
    if (!bookingId) {
      setError("Booking id missing");
      return;
    }

    const idempotencyKey =
      !freshAttempt && attemptKeyRef.current
        ? attemptKeyRef.current
        : createPaymentAttemptKey(bookingId);

    attemptKeyRef.current = idempotencyKey;
    setLoading(true);
    setError("");

    try {
      await loadRazorpayScript();

      const data = await createPaymentOrder({
        bookingId,
        token,
        idempotencyKey,
      });

      const razorpay = new window.Razorpay({
        key: data.keyId,
        order_id: data.razorpayOrderId,
        amount: data.amountInPaise,
        currency: data.currency,
        name: "Lexho",
        description: "Service payment",
        prefill: {
          name: customer?.name || "",
          contact: customer?.mobile || "",
          email: customer?.email || "",
        },
        handler: async (response) => {
          try {
            const verified = await verifyPayment({
              token,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setLoading(false);
            onSuccess?.(verified);
          } catch (verifyError) {
            const message = verifyError?.message || "Payment verification failed";
            setLoading(false);
            setError(message);
            onError?.(verifyError);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError("Payment cancelled. Please retry.");
          },
        },
      });

      razorpay.on("payment.failed", (failure) => {
        const message = failure?.error?.description || "Payment failed. Please retry.";
        setLoading(false);
        setError(message);
        onError?.(failure);
      });

      razorpay.open();
    } catch (paymentError) {
      const message = paymentError?.message || "Unable to start payment";
      setLoading(false);
      setError(message);
      onError?.(paymentError);
    }
  }

  return (
    <div>
      <button disabled={loading || !bookingId || !token} onClick={() => startPayment({ freshAttempt: true })}>
        {loading ? "Processing..." : error ? "Retry Payment" : "Pay Now"}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
