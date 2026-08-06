export type DispatchRouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type AdminBookingEtaUpdate = {
  bookingId: string;
  etaMinutes?: number | null;
  distanceMeters?: number | null;
  status?: string;
  updatedAt?: string;
};

export type AdminBookingNavigation = {
  bookingId: string;
  status: string;
  etaMinutes: number | null;
  distanceMeters: number | null;
  distanceText?: string;
  routePolyline?: string | null;
  routeCoordinates: DispatchRouteCoordinate[];
  partnerLocation: DispatchRouteCoordinate | null;
  customerLocation: DispatchRouteCoordinate | null;
  updatedAt?: string;
};

export type AdminBookingLiveTrackingSnapshot = {
  bookingId: string;
  status: string;
  paymentStatus?: string;
  scheduledAt?: string;
  partnerId?: string | null;
  partnerLocation: (DispatchRouteCoordinate & {
    pincode?: string;
    source?: string;
    updatedAt?: string;
  }) | null;
  events: Array<{
    id: string;
    bookingId: string;
    eventType: string;
    eventPayload: string;
    createdAt?: string;
  }>;
};
