export type CustomerProfileAdmin = {
  id: string;
  fullName: string;
  mobile: string;
  phoneNumber?: string;
  email: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "";
  profileImageUrl?: string;
  addressCount: number;
  active: boolean;
  profileEditLocked: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  profileImageApproved: boolean;
  adminNotes: string;
  updatedAt?: string;
};

export type CustomerProfileContent = {
  aboutUs: string;
  termsOfService: string;
  privacyPolicy: string;
};

export type CustomerProfileUpdatePayload = {
  profileEditLocked: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  profileImageApproved: boolean;
  adminNotes: string;
};

export type CustomerDeleteRequestItem = {
  id: string;
  customerId: string;
  customerName: string;
  reason: string;
  createdAt?: string;
  resolved: boolean;
};
