type RazorpayOptions = {
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  prefill?: {
    contact?: string;
    email?: string;
  };
  theme?: {
    color?: string;
  };
};

export async function openRazorpayCheckout(options: RazorpayOptions): Promise<{
  success: boolean;
  paymentId?: string;
  error?: string;
}> {
  try {
    const RazorpayCheckout = require("react-native-razorpay").default;
    const result = await RazorpayCheckout.open(options);
    return { success: true, paymentId: result?.razorpay_payment_id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Payment cancelled";
    return { success: false, error: message };
  }
}

