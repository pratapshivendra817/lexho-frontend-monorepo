export const CART_CONFIG = {
  defaultMode: "INSTANT" as const,
  slotDateWindowDays: 4,
  slotInfoText: "",
  sectionLabels: {
    reviewBooking: "Review booking",
    bookingDetails: "Booking details",
    billDetails: "Bill details",
    itemTotal: "Item total",
    gstAndFees: "GST & Service Fees",
    toPay: "To pay",
    addMore: "Add more services.",
    coupons: "View all coupons",
    location: "Location",
    selectAddress: "Select your address",
    missingPhone: "Add phone number",
  },
  actions: {
    instant: "Instant",
    scheduled: "Scheduled",
    selectTimeSlot: "Select time slot",
    bookNow: "Book now",
    remove: "Remove",
  },
  homeBookingOptions: {
    title: "What do you need today?",
    items: [
      {
        id: "instant",
        label: "Instant",
        description: "Start with the fastest available slot.",
        icon: "flash-outline",
        route: "InstantBookingWizard",
      },
      {
        id: "scheduled",
        label: "Schedule",
        description: "Pick a preferred date and time.",
        icon: "calendar-clock-outline",
        route: "ScheduleBookingWizard",
      },
      {
        id: "subscription",
        label: "Subscription",
        description: "Repeat service plans.",
        icon: "calendar-refresh-outline",
        route: "RecurringBooking",
      },
    ],
  },
  messages: {
    cartEmptyTitle: "Your cart is empty",
    cartEmptySubtitle: "Add services to start booking.",
    loadCartFailed: "Loading cart...",
    bookingFailedTitle: "Booking failed",
    missingServiceId: "Service id missing in cart.",
    bookingSuccess: "Booking created successfully.",
    bookingErrorFallback: "Unable to create booking.",
    selectAddressError: "Please select an address to continue.",
  },
} as const;

export function hidesSubscriptionBooking(value?: string | number | null) {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return /^(cook(athome)?|cleaning|breakfast(athome)?)(services?)?$/.test(normalized);
}

export function hidesInstantBooking(value?: string | number | null) {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return /^(vehicle wash|vehical wash|fitness wellness|fitness and wellness)( services?)?$/.test(normalized);
}

export function isPartyCategoryName(value?: string | number | null) {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.split(" ").includes("party") || normalized.split(" ").includes("parties");
}
