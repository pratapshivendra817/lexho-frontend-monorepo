import { createSlice } from "@reduxjs/toolkit";

function getCartItemKey(item = {}) {
  return item.cartKey || item.id;
}

const cartSlice = createSlice({
  name: "cart",
  initialState: { items: [] },
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload || {};
      const quantityToAdd = Number(item.quantity || 1);
      const cartKey = getCartItemKey(item);
      const existingItem = state.items.find(
        entry => getCartItemKey(entry) === cartKey
      );

      if (existingItem) {
        existingItem.quantity += quantityToAdd;
        return;
      }

      state.items.push({
        ...item,
        cartKey,
        quantity: quantityToAdd,
      });
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter(
        item => getCartItemKey(item) !== action.payload && item.id !== action.payload
      );
    },
    incrementQuantity: (state, action) => {
      const targetItem = state.items.find(
        item =>
          getCartItemKey(item) === action.payload || item.id === action.payload
      );

      if (targetItem) {
        targetItem.quantity += 1;
      }
    },
    decrementQuantity: (state, action) => {
      const targetItem = state.items.find(
        item =>
          getCartItemKey(item) === action.payload || item.id === action.payload
      );

      if (!targetItem) {
        return;
      }

      if (targetItem.quantity > 1) {
        targetItem.quantity -= 1;
        return;
      }

      state.items = state.items.filter(
        item =>
          getCartItemKey(item) !== action.payload && item.id !== action.payload
      );
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  incrementQuantity,
  decrementQuantity,
} = cartSlice.actions;

export const selectCartCount = state =>
  (state?.cart?.items ?? []).reduce(
    (total, item) => total + Number(item?.quantity || 1),
    0
  );

export const selectCartSubtotal = state =>
  (state?.cart?.items ?? []).reduce(
    (total, item) => total + Number(item?.price || 0) * Number(item?.quantity || 1),
    0
  );

export default cartSlice.reducer;
