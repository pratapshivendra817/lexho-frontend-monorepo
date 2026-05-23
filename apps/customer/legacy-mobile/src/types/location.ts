export type LocationAddress = {
  id: number;
  label?: string;
  addressLine?: string;
  city?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
};

export type ReverseGeocodePayload = {
  latitude: number;
  longitude: number;
};

export type ReverseGeocodeResult = {
  latitude?: number;
  longitude?: number;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
};

export type ServiceabilityCheckPayload = {
  pincode?: string;
  latitude?: number;
  longitude?: number;
};

export type ServiceabilityCheckResult = {
  serviceable: boolean;
  message?: string;
};
