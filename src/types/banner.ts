export type BannerStatus = "ACTIVE" | "INACTIVE" | "DRAFT";

export type BannerTag = "PROMO" | "OFFER" | "ENGAGE";

export interface Banner {
  id: number;
  title: string;
  tag: BannerTag;
  status: BannerStatus;
  slot: number;
}