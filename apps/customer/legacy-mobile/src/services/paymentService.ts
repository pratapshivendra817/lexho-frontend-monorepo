type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  method?: "upi" | "card" | "netbanking" | "wallet" | "emi";
  prefill?: {
    contact?: string;
    email?: string;
  };
  theme?: {
    color?: string;
  };
};

export type RazorpayPaymentFailureDetails = {
  code?: string;
  description?: string;
  reason?: string;
  orderId?: string;
  paymentId?: string;
  raw?: unknown;
};

function pickRazorpayFailure(error: unknown): RazorpayPaymentFailureDetails {
  const source = (error as any)?.error && typeof (error as any).error === "object" ? (error as any).error : error;
  const metadata = (source as any)?.metadata ?? {};
  return {
    code: String((source as any)?.code ?? "").trim() || undefined,
    description: String((source as any)?.description ?? (error as any)?.description ?? "").trim() || undefined,
    reason: String((source as any)?.reason ?? "").trim() || undefined,
    orderId: String(metadata?.order_id ?? metadata?.orderId ?? (source as any)?.order_id ?? "").trim() || undefined,
    paymentId: String(metadata?.payment_id ?? metadata?.paymentId ?? (source as any)?.payment_id ?? "").trim() || undefined,
    raw: source,
  };
}

export async function openRazorpayCheckout(options: RazorpayOptions): Promise<{
  success: boolean;
  paymentId?: string;
  orderId?: string;
  signature?: string;
  error?: string;
  failure?: RazorpayPaymentFailureDetails;
}> {
  try {
    const RazorpayCheckout = require("react-native-razorpay").default;
    const result = await RazorpayCheckout.open(options);
    return {
      success: true,
      orderId: result?.razorpay_order_id,
      paymentId: result?.razorpay_payment_id,
      signature: result?.razorpay_signature,
    };
  } catch (error: unknown) {
    const failure = pickRazorpayFailure(error);
    const message =
      failure.description ||
      (error instanceof Error ? error.message : "") ||
      "Payment cancelled";
    return { success: false, error: message, failure };
  }
}
