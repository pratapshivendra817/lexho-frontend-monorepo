export type HomeSectionType = "STATS" | "TRUST" | "TAGLINE" | "HIGHLIGHTS" | "BANNERS" | "CUSTOM";

export type HomeSectionItem = {
  id: string;
  title: string;
  value?: string;
  priority: number;
  isActive: boolean;
};

export type HomeSection = {
  id: string;
  type: HomeSectionType;
  title: string;
  subtitle?: string;
  priority: number;
  isActive: boolean;
  items: HomeSectionItem[];
};
