export type ServiceCategory = "COOK" | "CLEANING";
export type AvailabilityType = "FULL_TIME" | "PART_TIME" | "ON_DEMAND";
export type Gender = "MALE" | "FEMALE" | "OTHER";

export type ProviderOnboardingPayload = {
  fullName: string;
  email: string;
  phone: string;
  gender: Gender;
  dob: string;
  city: string;
  state: string;
  fullAddress: string;
  category: ServiceCategory;
  experience: string;
  availabilityType: AvailabilityType;
  serviceAreas: string[];
  workingDays: string[];
  startTime: string;
  endTime: string;
  accountNumber: string;
  ifscCode: string;
};

export type ProviderOnboardingResponse = {
  providerId: string;
  status?: string;
  message?: string;
};

export type DocumentType =
  | "AADHAAR_FRONT"
  | "AADHAAR_BACK"
  | "PAN"
  | "PROFILE_PHOTO"
  | "CERTIFICATE";

export type UploadedDocument = {
  id: string;
  documentType: DocumentType;
  url?: string;
  contentType?: string;
};
