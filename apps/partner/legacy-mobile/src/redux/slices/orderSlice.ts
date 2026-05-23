import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { PartnerOrder } from "../../types/order";

type OrderState = {
  newOrders: PartnerOrder[];
  history: PartnerOrder[];
  activeOrder: PartnerOrder | null;
  loading: boolean;
  page: number;
  hasMore: boolean;
};

const initialState: OrderState = {
  newOrders: [],
  history: [],
  activeOrder: null,
  loading: false,
  page: 0,
  hasMore: true,
};

const orderSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    setNewOrders: (state, action: PayloadAction<PartnerOrder[]>) => {
      state.newOrders = action.payload;
    },
    setOrderHistory: (state, action: PayloadAction<PartnerOrder[]>) => {
      state.history = action.payload;
    },
    appendOrderHistory: (state, action: PayloadAction<PartnerOrder[]>) => {
      state.history = [...state.history, ...action.payload];
    },
    setActiveOrder: (state, action: PayloadAction<PartnerOrder | null>) => {
      state.activeOrder = action.payload;
    },
    setOrderLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setHistoryPagination: (state, action: PayloadAction<{ page: number; hasMore: boolean }>) => {
      state.page = action.payload.page;
      state.hasMore = action.payload.hasMore;
    },
  },
});

export const {
  setNewOrders,
  setOrderHistory,
  appendOrderHistory,
  setActiveOrder,
  setOrderLoading,
  setHistoryPagination,
} = orderSlice.actions;

export default orderSlice.reducer;
