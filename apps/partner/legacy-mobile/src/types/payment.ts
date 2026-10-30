export type PartnerEarningsSummary = {
  todaySettlement: number;
  weekSettlement: number;
  monthSettlement: number;
  lifetimeSettlement: number;
  availableBalance?: number;
  pendingSettlement?: number;
};

export type PartnerEarningsTransaction = {
  id: string;
  bookingId?: string;
  description: string;
  amount: number;
  netAmount?: number;
  settlementAmount?: number;
  type?: string;
  status?: string;
  createdAt?: string;
};

export type PartnerPayout = {
  id: string;
  settlementAmount: number;
  status: string;
  createdAt?: string;
  settledAt?: string;
};

export type PartnerBankDetails = {
  maskedAccountNumber: string;
  ifscCode?: string;
  verificationStatus?: string;
  rejectionReason?: string;
};

export type PartnerWithdrawalBalance = {
  availableBalance: number;
  settledBalance: number;
  reservedBalance: number;
};

export type PartnerWithdrawal = {
  id: string;
  amount: number;
  status: string;
  requestedAt?: string;
  processedAt?: string;
};
