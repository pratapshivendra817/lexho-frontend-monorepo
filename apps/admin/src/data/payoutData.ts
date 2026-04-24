import type { Payout } from "../types/payout";

export const payoutData: Payout[] = [
  {
    id: "PO1",
    providerName: "Amit Sharma",
    earnings: 5000,
    platformFee: 500,
    finalPayout: 4500,
    status: "PENDING",
  },
  {
    id: "PO2",
    providerName: "Rahul Verma",
    earnings: 7000,
    platformFee: 700,
    finalPayout: 6300,
    status: "SUCCESS",
  },
  {
    id: "PO3",
    providerName: "Sanjay Singh",
    earnings: 4000,
    platformFee: 400,
    finalPayout: 3600,
    status: "FAILED",
  },
];