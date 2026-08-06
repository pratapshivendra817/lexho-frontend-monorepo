export type AdminCleaningCoverageTask = {
  id?: number;
  name: string;
  estimatedMinutes: number;
  icon: string;
  sortOrder?: number;
};

export type AdminCleaningCoverage = {
  id: number;
  durationHours: number;
  reference: string;
  sortOrder: number;
  active: boolean;
  tasks: AdminCleaningCoverageTask[];
};

export type AdminCleaningCoveragePayload = {
  durationHours: number;
  reference: string;
  sortOrder?: number;
  active?: boolean;
  tasks: AdminCleaningCoverageTask[];
};

export type CookFamilySize = "SMALL" | "MEDIUM" | "LARGE" | "XLARGE";

export type AdminCookCoverageItem = {
  id?: number;
  name: string;
  icon: string;
  sortOrder?: number;
  quantity?: number;
};

export type AdminCookCoverage = {
  id: number;
  serviceId: number | null;
  familySize: CookFamilySize;
  members: string;
  familySizeLabel: string;
  reference: string;
  sortOrder: number;
  active: boolean;
  items: AdminCookCoverageItem[];
};

export type AdminCookCoveragePayload = {
  serviceId: number;
  familySize: CookFamilySize;
  members: string;
  familySizeLabel: string;
  reference?: string;
  sortOrder?: number;
  active?: boolean;
  items: AdminCookCoverageItem[];
};
