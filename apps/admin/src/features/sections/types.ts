export type SectionType = "STATS" | "TRUST" | "BANNERS" | "CUSTOM";

export type AdminSection = {
  id: number;
  type: SectionType;
  title: string;
  priority: number;
  isActive: boolean;
  itemsCount: number;
};

export type SectionItemPayload = {
  title: string;
  value: string;
  priority: number;
  isActive: boolean;
};

export type SectionPayload = {
  type: SectionType;
  title: string;
  isActive: boolean;
};
