export type AdminPaymentAttemptStatus = "CREATED" | "PAID" | "FAILED" | "REFUNDED";

export type AdminPaymentDashboard = {
  createdAttempts: number;
  paidAttempts: number;
  failedAttempts: number;
  refundedAttempts: number;
  paidAmount: number;
  processedRefundAmount: number;
};

export type AdminPaymentTransaction = {
  id: string;
  bookingId: string;
  status: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminPaymentRefund = {
  id: string;
  amount: number;
  status: string;
  reason: string;
  razorpayRefundId: string;
  createdAt: string;
  processedAt: string;
};

export type AdminBookingPaymentDetail = {
  bookingId: string;
  paymentStatus: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  attempts: AdminPaymentTransaction[];
  refunds: AdminPaymentRefund[];
};

export type AdminPaymentTransactionParams = {
  bookingId?: string;
  status?: AdminPaymentAttemptStatus | "";
  page: number;
  size: number;
};

export type AdminPaymentTransactionsResponse = {
  content: AdminPaymentTransaction[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
};
