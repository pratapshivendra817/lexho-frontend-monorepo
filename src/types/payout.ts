export interface Payout {
  id: string;
  providerName: string;
  earnings: number;
  platformFee: number;
  finalPayout: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
}