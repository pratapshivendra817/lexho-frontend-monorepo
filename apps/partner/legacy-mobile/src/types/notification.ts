export type PartnerNotification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt?: string;
  source?: "system" | "warning";
  redirectType?: string;
  redirectValue?: string;
  warningId?: string;
};
