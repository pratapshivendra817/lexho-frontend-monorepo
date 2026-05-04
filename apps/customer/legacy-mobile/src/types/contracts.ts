export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export type ListEnvelope<T> = {
  data?: T[];
  content?: T[];
};

export type AuthUserDto = {
  id: string;
  mobile: string;
  name?: string;
  email?: string;
  avatar?: string;
};

export type SendOtpRequest = { mobile: string };
export type SendOtpResponse = { success?: boolean; message?: string; resendAfter?: number; otp?: string; code?: string };

export type VerifyOtpRequest = { mobile: string; otp: string };
export type VerifyOtpResponse = { token: string; refreshToken?: string; user?: AuthUserDto };

export type RefreshTokenRequest = { refreshToken: string };
export type RefreshTokenResponse = { token: string; refreshToken?: string };

export type BannerDto = {
  id?: string;
  bannerId?: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  redirectUrl?: string;
  redirectType?: string;
  redirectValue?: string;
  promoCode?: string;
  status?: string;
  ctaLabel?: string;
  ctaText?: string;
};
export type CategoryDto = {
  id?: string;
  categoryId?: string;
  name?: string;
  categoryName?: string;
  icon?: string;
  categoryIcon?: string;
  imageUrl?: string;
  categoryImage?: string;
  displayOrder?: number;
  activeStatus?: boolean | string;
};
export type ServiceDto = { id: string; categoryId?: string; name: string; description?: string; price?: number; durationMinutes?: number; imageUrl?: string };
export type BookingSummaryDto = { id: string; status?: string; serviceName?: string; createdAt?: string };

export type HomeDashboardResponse = {
  greeting?: string;
  location?: string;
  recentBookings?: BookingSummaryDto[];
};

export type UpdateProfileRequest = { name?: string; email?: string };
export type ProfileResponse = AuthUserDto & { createdAt?: string };

export type AddressDto = { id: string; label: string; line1: string; city: string; isDefault?: boolean };
export type AddAddressRequest = { label: string; line1: string; city: string };
export type UpdateAddressRequest = { id: string; label?: string; line1?: string; city?: string };

export type CartItemDto = { id: string; serviceId: string; name?: string; quantity: number; price?: number };
export type AddCartRequest = { serviceId: string; quantity: number };
export type UpdateCartRequest = { id: string; quantity: number };

export type CreateBookingRequest = { serviceId: string; addressId: string; slot?: string; note?: string };
export type RescheduleBookingRequest = { date: string };
export type LiveLocationResponse = { lat?: number; lng?: number; eta?: string };

export type PaymentMode = "UPI" | "CARD" | "WALLET" | "COD";
export type InitiatePaymentRequest = { mode: PaymentMode; bookingId?: string; amount?: number };
export type RefundPaymentRequest = { bookingId: string; amount: number };

export type CouponDto = { id?: string; code: string; description?: string; discount?: number };
export type ApplyCouponRequest = { code: string };

export type ReviewDto = { id: string; serviceId?: string; rating: number; comment: string; imageUrls?: string[]; createdAt?: string; serviceName?: string };
export type AddReviewRequest = { serviceId: string; rating: number; comment: string; imageUrls?: string[] };

export type FavoriteDto = { id: string; serviceId: string; name?: string };
export type AddFavoriteRequest = { serviceId: string };

export type NotificationDto = { id: string; title: string; message: string; read?: boolean; createdAt?: string };

export type ApplyReferralRequest = { code: string };
export type CreateSubscriptionRequest = { planId: string };

export type CreateSupportTicketRequest = { subject: string; message: string };
export type SupportTicketDto = { id: string; subject: string; message: string; status?: string; createdAt?: string };
