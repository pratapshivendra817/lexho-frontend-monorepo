export type AdminCookFamilySize = {
  familySizeId: number;
  familySize: "SMALL" | "MEDIUM" | "LARGE" | "XLARGE" | string;
  familySizeLabel: string;
  active: boolean;
  displayOrder: number;
};

export type AdminCookFamilySizePayload = {
  familySize: string;
  familySizeLabel: string;
  active: boolean;
  displayOrder: number;
};
