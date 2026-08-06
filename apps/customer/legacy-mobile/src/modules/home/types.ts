export type HomeSectionType = "STATS" | "TRUST" | "TAGLINE" | "HIGHLIGHTS";
export type HomeSectionApiType = HomeSectionType | "BANNERS" | "CUSTOM";

export type HomeSectionItem = {
  id: number;
  sectionId: number;
  title: string;
  subtitle?: string | null;
  value?: string | null;
  icon?: string | null;
  color?: string | null;
  borderColor?: string | null;
  backgroundColor?: string | null;
  iconColor?: string | null;
  priority: number;
  active: boolean;
};

export type HomeSection = {
  id: number;
  type: HomeSectionApiType;
  title?: string | null;
  subtitle?: string | null;
  icon?: string | null;
  color?: string | null;
  borderColor?: string | null;
  backgroundColor?: string | null;
  iconColor?: string | null;
  priority: number;
  active: boolean;
  createdAt?: string | null;
  items: HomeSectionItem[];
};
