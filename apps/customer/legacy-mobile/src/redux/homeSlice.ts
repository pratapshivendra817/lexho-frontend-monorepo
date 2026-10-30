import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getBanners, getCategories } from "../api/homeApi";
import { getPopularServicesByCategory } from "../api/popularServicesApi";
import { Platform } from "react-native";
import type { BannerDto, CategoryDto } from "../types/contracts";

type HomeState = {
  loading: boolean;
  error: string | null;
  banners: any[];
  categories: any[];
  popular: any[];
  recommended: any[];
  quick: any[];
};

const initialState: HomeState = {
  loading: false,
  error: null,
  banners: [],
  categories: [],
  popular: [],
  recommended: [],
  quick: [],
};
const POPULAR_CATEGORY_BATCH_SIZE = 4;

export const fetchHomeData = createAsyncThunk("home/fetch", async () => {
  const [bannersRes, categoriesRes] = await Promise.allSettled([
    getBanners(),
    getCategories(),
  ]);

  const bannersRaw = bannersRes.status === "fulfilled" ? bannersRes.value : [];
  const categoriesRaw = categoriesRes.status === "fulfilled" ? categoriesRes.value : [];
  let popular: any[] = [];
  const recommended: any[] = [];
  const quick: any[] = [];

  const now = new Date();
  const currentPlatform = Platform.OS.toUpperCase();
  const currentCity: string = "";
  const allBanners = Array.isArray(bannersRaw) ? bannersRaw : [];
  const filteredBanners = allBanners.filter((item: BannerDto) => {
    const status = String(item?.status ?? "").toUpperCase();
    const statusOk = !status || status === "ACTIVE" || status === "TRUE" || status === "1";

    const startRaw = String((item as any)?.startDate ?? (item as any)?.startsAt ?? "");
    const endRaw = String((item as any)?.endDate ?? (item as any)?.endsAt ?? "");
    const startDate = startRaw ? new Date(startRaw) : null;
    const endDate = endRaw ? new Date(endRaw) : null;
    const startOk = !startDate || Number.isNaN(startDate.getTime()) || now >= startDate;
    const endOk = !endDate || Number.isNaN(endDate.getTime()) || now <= endDate;

    const cityRaw = String((item as any)?.city ?? (item as any)?.targetCity ?? "").toUpperCase().trim();
    const cityOk =
      !cityRaw ||
      cityRaw === "ALL" ||
      !currentCity ||
      currentCity.includes(cityRaw) ||
      cityRaw.includes(currentCity);

    const platformRaw = String((item as any)?.platformType ?? "").toUpperCase().trim();
    const audienceRaw = String((item as any)?.audience ?? "").toUpperCase().trim();
    const platformOk =
      !platformRaw ||
      platformRaw === "ALL" ||
      platformRaw === currentPlatform ||
      platformRaw === "ANDROID_IOS" ||
      platformRaw === "MOBILE" ||
      platformRaw === "CUSTOMER" ||
      platformRaw === "BOTH";
    const audienceOk = !audienceRaw || audienceRaw === "CUSTOMER" || audienceRaw === "BOTH" || audienceRaw === "ALL";
    return statusOk && startOk && endOk && cityOk && platformOk && audienceOk;
  });
  const banners = filteredBanners.length > 0 ? filteredBanners : allBanners;

  const categories = (Array.isArray(categoriesRaw) ? categoriesRaw : [])
    .filter((item: CategoryDto) => {
      const active = item?.activeStatus ?? (item as any)?.status;
      if (typeof active === "boolean") return active;
      const normalized = String(active ?? "").toLowerCase();
      if (!normalized) return true;
      if (normalized === "inactive" || normalized === "false" || normalized === "0" || normalized === "disabled") return false;
      return true;
    })
    .sort((a: CategoryDto, b: CategoryDto) => Number(a?.displayOrder ?? 9999) - Number(b?.displayOrder ?? 9999));

  if (!Array.isArray(popular) || popular.length === 0) {
    const categoryIds = categories
      .map((item: CategoryDto) => String(item?.categoryId ?? (item as any)?.id ?? "").trim())
      .filter(Boolean)
      .slice(0, 12);
    if (categoryIds.length > 0) {
      const merged: any[] = [];
      for (let offset = 0; offset < categoryIds.length; offset += POPULAR_CATEGORY_BATCH_SIZE) {
        const categoryBatch = categoryIds.slice(offset, offset + POPULAR_CATEGORY_BATCH_SIZE);
        const responses = await Promise.allSettled(
          categoryBatch.map((categoryId) => getPopularServicesByCategory(categoryId)),
        );
        responses.forEach((response, index) => {
          if (response.status !== "fulfilled") return;
          const categoryId = categoryBatch[index];
          response.value.forEach((row: any) => {
            merged.push({
              ...row,
              categoryId: row?.categoryId ?? categoryId,
            });
          });
        });
      }
      const dedup = new Map<string, any>();
      merged.forEach((row: any, idx: number) => {
        const key = String(row?.id ?? row?.serviceId ?? `popular-${idx}`);
        if (!dedup.has(key)) dedup.set(key, row);
      });
      popular = Array.from(dedup.values());
    }
  }

  const hasAnyHomeData =
    banners.length > 0 ||
    categories.length > 0 ||
    (Array.isArray(popular) && popular.length > 0) ||
    recommended.length > 0 ||
    quick.length > 0;

  if (!hasAnyHomeData) {
    throw new Error("Home data is empty. Please check backend connection, auth token, or serviceable area data.");
  }

  return { banners, categories, popular, recommended, quick };
});

const homeSlice = createSlice({
  name: "home",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHomeData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHomeData.fulfilled, (state, action) => {
        state.loading = false;
        state.banners = action.payload.banners;
        state.categories = action.payload.categories;
        state.popular = action.payload.popular;
        state.recommended = action.payload.recommended;
        state.quick = action.payload.quick;
      })
      .addCase(fetchHomeData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to load home";
      });
  },
});

export default homeSlice.reducer;
