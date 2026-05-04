import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getBanners, getCategories, getQuickServices, getRecommendedServices } from "../api/homeApi";
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

export const fetchHomeData = createAsyncThunk("home/fetch", async () => {
  const [bannersRes, categoriesRes, recommendedRes, quickRes] = await Promise.allSettled([
    getBanners(),
    getCategories(),
    getRecommendedServices(),
    getQuickServices(),
  ]);

  const bannersRaw = bannersRes.status === "fulfilled" ? bannersRes.value : [];
  const categoriesRaw = categoriesRes.status === "fulfilled" ? categoriesRes.value : [];
  const popular: any[] = [];
  const recommended = recommendedRes.status === "fulfilled" ? recommendedRes.value : [];
  const quick = quickRes.status === "fulfilled" ? quickRes.value : [];

  const now = new Date();
  const currentPlatform = Platform.OS.toUpperCase();
  const currentCity = "BHOPAL";
  const banners = (Array.isArray(bannersRaw) ? bannersRaw : []).filter((item: BannerDto) => {
    const status = String(item?.status ?? "").toUpperCase();
    const statusOk = !status || status === "ACTIVE" || status === "TRUE" || status === "1";

    const startRaw = String((item as any)?.startDate ?? (item as any)?.startsAt ?? "");
    const endRaw = String((item as any)?.endDate ?? (item as any)?.endsAt ?? "");
    const startDate = startRaw ? new Date(startRaw) : null;
    const endDate = endRaw ? new Date(endRaw) : null;
    const startOk = !startDate || Number.isNaN(startDate.getTime()) || now >= startDate;
    const endOk = !endDate || Number.isNaN(endDate.getTime()) || now <= endDate;

    const cityRaw = String((item as any)?.city ?? "").toUpperCase().trim();
    const cityOk = !cityRaw || cityRaw === "ALL" || currentCity.includes(cityRaw) || cityRaw.includes(currentCity);

    const platformRaw = String((item as any)?.platformType ?? "").toUpperCase().trim();
    const platformOk = !platformRaw || platformRaw === "ALL" || platformRaw === currentPlatform;

    const slot = Number((item as any)?.slotNumber ?? (item as any)?.slot ?? 1);
    const topSlotOk = !Number.isFinite(slot) || slot <= 1;

    return statusOk && startOk && endOk && cityOk && platformOk && topSlotOk;
  });

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
