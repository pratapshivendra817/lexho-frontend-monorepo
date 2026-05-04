import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { CartItem } from "../../types/api";

type CartState = {
  items: CartItem[];
};

const initialState: CartState = {
  items: [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    setCart(state, action: PayloadAction<CartItem[]>) {
      state.items = action.payload;
    },
    addToCart(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find((item) => item.serviceId === action.payload.serviceId);
      if (existing) {
        existing.quantity += action.payload.quantity;
        return;
      }
      state.items.push(action.payload);
    },
    updateCartQuantity(state, action: PayloadAction<{ serviceId: string; quantity: number }>) {
      state.items = state.items
        .map((item) =>
          item.serviceId === action.payload.serviceId ? { ...item, quantity: action.payload.quantity } : item,
        )
        .filter((item) => item.quantity > 0);
    },
    removeFromCart(state, action: PayloadAction<{ serviceId: string }>) {
      state.items = state.items.filter((item) => item.serviceId !== action.payload.serviceId);
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const { setCart, addToCart, updateCartQuantity, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;

