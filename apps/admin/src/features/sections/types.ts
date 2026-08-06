export type SectionType = "STATS" | "TRUST" | "TAGLINE" | "HIGHLIGHTS";

export type SectionItem = {
  id: number;
  sectionId: number;
  title: string;
  subtitle?: string | null;
  value?: string | null;
  icon: string;
  color?: string | null;
  borderColor?: string | null;
  backgroundColor?: string | null;
  iconColor?: string | null;
  priority: number;
  active: boolean;
};

export type Section = {
  id: number;
  type: SectionType;
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
  items: SectionItem[];
};

export type AdminSection = Section;

export type SectionItemPayload = {
  title: string;
  subtitle?: string | null;
  value?: string | null;
  icon: string;
  color?: string | null;
  borderColor?: string | null;
  backgroundColor?: string | null;
  iconColor?: string | null;
  priority: number;
  isActive: boolean;
};

export type SectionPayload = {
  type: SectionType;
  title?: string | null;
  subtitle?: string | null;
  icon?: string | null;
  color?: string | null;
  borderColor?: string | null;
  backgroundColor?: string | null;
  iconColor?: string | null;
  priority: number;
  isActive: boolean;
};
