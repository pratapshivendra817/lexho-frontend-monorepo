import { create } from "zustand";

export const useCartStore = create((set, get) => ({
  items: {},
  addService: service =>
    set(state => {
      const existing = state.items[service.id];

      return {
        items: {
          ...state.items,
          [service.id]: {
            ...service,
            quantity: existing ? existing.quantity + 1 : 1,
          },
        },
      };
    }),
  incrementQuantity: serviceId =>
    set(state => {
      const existing = state.items[serviceId];

      if (!existing) {
        return state;
      }

      return {
        items: {
          ...state.items,
          [serviceId]: {
            ...existing,
            quantity: existing.quantity + 1,
          },
        },
      };
    }),
  decrementQuantity: serviceId =>
    set(state => {
      const existing = state.items[serviceId];

      if (!existing) {
        return state;
      }

      if (existing.quantity <= 1) {
        const nextItems = { ...state.items };
        delete nextItems[serviceId];
        return { items: nextItems };
      }

      return {
        items: {
          ...state.items,
          [serviceId]: {
            ...existing,
            quantity: existing.quantity - 1,
          },
        },
      };
    }),
  clearCart: () => set({ items: {} }),
  getTotalItems: () =>
    Object.values(get().items).reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    ),
  getTotalPrice: () =>
    Object.values(get().items).reduce(
      (total, item) =>
        total + Number(item.priceValue || 0) * Number(item.quantity || 0),
      0
    ),
}));
