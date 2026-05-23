export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Partner {
  id: string;
  name: string;
  phone: string;
  city: string;
  experience: string;
  rating: number;

  documents: {
    aadhar: string;
    pan: string;
    photo: string;
  };

  status: VerificationStatus;
}

