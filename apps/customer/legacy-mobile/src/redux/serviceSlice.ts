import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchCustomerServicesByCategory, type CustomerServiceDto } from "../api/serviceApi";
import { fetchCustomerBannersByCategory, type CategoryBannerDto } from "../api/bannerApi";

type ServiceState = {
  services: CustomerServiceDto[];
  banners: CategoryBannerDto[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  bannersLoading: boolean;
  hasMore: boolean;
  page: number;
  error: string | null;
  bannersError: string | null;
  activeCategoryId: string | number | null;
};

const initialState: ServiceState = {
  services: [],
  banners: [],
  loading: false,
  refreshing: false,
  loadingMore: false,
  bannersLoading: false,
  hasMore: true,
  page: 0,
  error: null,
  bannersError: null,
  activeCategoryId: null,
};

export const fetchServicesByCategory = createAsyncThunk(
  "service/fetchByCategory",
  async (params: { categoryId: string | number; page?: number; size?: number; append?: boolean }) => {
    const services = await fetchCustomerServicesByCategory(params);
    return {
      services,
      categoryId: params.categoryId,
      page: params.page ?? 0,
      size: params.size ?? 20,
      append: Boolean(params.append),
    };
  },
);

export const fetchBannersByCategory = createAsyncThunk(
  "service/fetchBannersByCategory",
  async (params: { categoryId: string | number }) => {
    const banners = await fetchCustomerBannersByCategory(params.categoryId);
    return { banners, categoryId: params.categoryId };
  },
);

const serviceSlice = createSlice({
  name: "service",
  initialState,
  reducers: {
    clearServices(state) {
      state.services = [];
      state.error = null;
      state.loading = false;
      state.loadingMore = false;
      state.refreshing = false;
      state.page = 0;
      state.hasMore = true;
      state.banners = [];
      state.bannersLoading = false;
      state.bannersError = null;
      state.activeCategoryId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchServicesByCategory.pending, (state, action) => {
        const page = action.meta.arg.page ?? 0;
        const append = Boolean(action.meta.arg.append);
        state.loading = !append && page === 0 && state.services.length === 0;
        state.refreshing = !append && page === 0 && state.services.length > 0;
        state.loadingMore = append || page > 0;
        state.error = null;
        state.activeCategoryId = action.meta.arg.categoryId;
      })
      .addCase(fetchServicesByCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.loadingMore = false;
        state.page = action.payload.page;
        state.hasMore = action.payload.services.length >= action.payload.size;
        state.services = action.payload.append
          ? [...state.services, ...action.payload.services]
          : action.payload.services;
      })
      .addCase(fetchServicesByCategory.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.loadingMore = false;
        state.error = action.error.message ?? "Unable to load services";
      })
      .addCase(fetchBannersByCategory.pending, (state) => {
        state.bannersLoading = true;
        state.bannersError = null;
      })
      .addCase(fetchBannersByCategory.fulfilled, (state, action) => {
        state.bannersLoading = false;
        state.banners = action.payload.banners;
      })
      .addCase(fetchBannersByCategory.rejected, (state, action) => {
        state.bannersLoading = false;
        state.bannersError = action.error.message ?? "Unable to load banners";
      });
  },
});

export const { clearServices } = serviceSlice.actions;
export default serviceSlice.reducer;
