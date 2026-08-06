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

export type SendOtpRequest = { mobile: string; role?: "CUSTOMER" | "PARTNER" };
export type SendOtpResponse = { success?: boolean; message?: string; resendAfter?: number; otp?: string; code?: string };

export type VerifyOtpRequest = { mobile: string; otp: string };
export type VerifyOtpResponse = { token: string; refreshToken?: string; user?: AuthUserDto };

export type RefreshTokenRequest = { refreshToken: string; deviceId: string };
export type RefreshTokenResponse = { accessToken: string; refreshToken?: string; expiresIn?: number };

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
export type BookingType = "INSTANT" | "SCHEDULED" | "SUBSCRIPTION";
export type AssignmentStatus =
  | "SEARCHING_PARTNER"
  | "PARTNER_ASSIGNED"
  | "PARTNER_ON_THE_WAY"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "INSTANT_FAILED"
  | "SCHEDULED"
  | "CANCELLED"
  | "COMPLETED";
export type BookingMapReason =
  | "PAYMENT_NOT_PAID"
  | "TRACKING_NOT_ACTIVE"
  | "PARTNER_NOT_ASSIGNED"
  | "PARTNER_LOCATION_UNAVAILABLE"
  | "UNAVAILABLE"
  | string;
export type BookingMapDetails = {
  enabled?: boolean;
  provider?: "MAPBOX" | string;
  reason?: BookingMapReason;
  partner?: {
    id?: string | number;
    latitude?: number | string;
    longitude?: number | string;
    updatedAt?: string;
    lastHeartbeatAt?: string;
  };
  customer?: {
    latitude?: number | string;
    longitude?: number | string;
  };
};
export type TrackingScreen =
  | "INSTANT_STATUS"
  | "LIVE_TRACKING"
  | "PARTNER_ARRIVED"
  | "SERVICE_STARTED"
  | "SERVICE_IN_PROGRESS"
  | "SERVICE_COMPLETED"
  | "SCHEDULED_STATUS"
  | "SUBSCRIPTION_DETAILS"
  | "PAYMENT_STATUS"
  | "BOOKING_PROCESSING"
  | "BOOKING_DETAIL"
  | string;
export type BookingMetaDto = {
  trackingScreen?: TrackingScreen;
  showMap?: boolean;
  canReview?: boolean;
  reviewSubmitted?: boolean;
  canCancel?: boolean;
  canReschedule?: boolean;
  canCallPartner?: boolean;
  canTrackPartner?: boolean;
  canRaiseIssue?: boolean;
  canPause?: boolean;
  canResume?: boolean;
  trackingRefreshSeconds?: number;
  retryPaymentAllowed?: boolean;
  arrivalTime?: string;
  [key: string]: unknown;
};
export type BookingStatusHistoryDto = {
  key?: string;
  label: string;
  status?: "DONE" | "ACTIVE" | "PENDING" | string;
  completed?: boolean;
  active?: boolean;
  timestamp?: string;
};
export type BookingSummaryDto = {
  id: string;
  bookingId?: string;
  serviceId?: string;
  status?: string;
  serviceName?: string;
  createdAt?: string;
  scheduledAt?: string;
  completedAt?: string;
  amount?: number;
  totalAmount?: number;
  price?: number;
  address?: string;
  fullAddress?: string;
  bookingType?: BookingType;
  assignmentStatus?: AssignmentStatus | string;
  promisedStartTime?: string;
  slaMinutes?: number;
  unavailableReason?: string;
  message?: string;
  etaMinutes?: number;
  partnerName?: string;
  partnerPhone?: string;
  partnerId?: string;
  partnerRating?: number;
  partnerProfileImage?: string;
  subscriptionId?: string;
  subscriptionServiceType?: "CLEANING" | "COOK" | string;
  frequencyDays?: string[];
  frequencyLabel?: string;
  startDate?: string;
  endDate?: string;
  visits?: number;
  remainingVisits?: number;
  timeSlot?: string;
  nextServiceDate?: string;
  nextVisitDate?: string;
  paymentStatus?: string;
  trackingStatus?: string;
  map?: BookingMapDetails;
  serviceStartedAt?: string;
  estimatedCompletionTime?: string;
  progressStatus?: string;
  retryPaymentAllowed?: boolean;
  arrivalTime?: string;
  canPause?: boolean;
  canResume?: boolean;
  meta?: BookingMetaDto;
  statusHistory?: BookingStatusHistoryDto[];
};

export type BookingHistoryPageDto = {
  items: BookingSummaryDto[];
  instantBookings?: BookingSummaryDto[];
  scheduledBookings?: BookingSummaryDto[];
  subscriptions?: BookingSummaryDto[];
  hasMore: boolean;
  page?: number;
  size?: number;
};

export type SubscriptionVisitDto = {
  id: string;
  bookingId?: string;
  serviceName?: string;
  scheduledAt?: string;
  status?: string;
  partnerName?: string;
  amount?: number;
  section?: string;
  statusHistory?: BookingStatusHistoryDto[];
};

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
export type AddCartRequest = { serviceId: string; quantity: number; addons?: { addonId: number; quantity: number }[] };
export type UpdateCartRequest = { id: string; quantity: number };

export type CreateBookingRequest = {
  serviceId: string;
  addressId: string;
  date?: string;
  slot?: string;
  note?: string;
  latitude?: number;
  longitude?: number;
};
export type RescheduleBookingRequest = { date: string };
export type LiveLocationResponse = { lat?: number; lng?: number; eta?: string };
export type SlotOption = {
  slot: string;
  etaMinutes?: number;
  instantEligible?: boolean;
  available?: boolean;
};

export type PaymentMode = "UPI" | "CARD" | "WALLET" | "COD";
export type InitiatePaymentRequest = { mode: PaymentMode; bookingId?: string; amount?: number };
export type RefundPaymentRequest = { bookingId: string; amount: number };

export type CouponDto = { id?: string; code: string; description?: string; discount?: number };
export type ApplyCouponRequest = { code: string };

export type ReviewDto = { id: string; serviceId?: string; rating: number; comment: string; imageUrls?: string[]; createdAt?: string; serviceName?: string };
export type AddReviewRequest = { serviceId: string; rating: number; comment: string; imageUrls?: string[] };
export type SubmitCustomerReviewRequest = { bookingId: string; rating: number; reviewText?: string };

export type FavoriteDto = { id: string; serviceId: string; name?: string };
export type AddFavoriteRequest = { serviceId: string };

export type NotificationDto = { id: string; title: string; message: string; read?: boolean; createdAt?: string };

export type ApplyReferralRequest = { code: string };

export type CreateSupportTicketRequest = { subject: string; message: string };
export type SupportTicketDto = { id: string; subject: string; message: string; status?: string; createdAt?: string };
