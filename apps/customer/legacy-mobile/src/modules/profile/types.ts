export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export type CustomerAddress = {
  id: number;
  label?: string;
  addressLine: string;
  city?: string;
  pincode?: string;
  default?: boolean;
};

export type CustomerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "";
  dateOfBirth: string;
  profileImageUrl: string;
};

export type ProfileUpdatePayload = {
  firstName: string;
  lastName: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "";
  dateOfBirth: string;
};

export type ProfileEmailPayload = {
  email: string;
};

export type AccountDeleteRequestPayload = {
  reason?: string;
};

export type ImageUploadPayload = {
  uri: string;
  type?: string;
  name?: string;
};

export type ProfileFormValues = {
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "";
  dateOfBirth: string;
};

export type CustomerProfileContent = {
  aboutUs: string;
  termsOfService: string;
  privacyPolicy: string;
};
