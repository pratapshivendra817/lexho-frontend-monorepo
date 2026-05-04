import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import homeReducer from "./homeSlice";
import bookingReducer from "./bookingSlice";
import addressReducer from "./addressSlice";
import cartReducer from "./cartSlice";
import favoritesReducer from "./favoritesSlice";
import subscriptionsReducer from "./subscriptionSlice";
import serviceReducer from "./serviceSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    home: homeReducer,
    booking: bookingReducer,
    address: addressReducer,
    cart: cartReducer,
    favorites: favoritesReducer,
    subscriptions: subscriptionsReducer,
    service: serviceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: !__DEV__ ? true : false,
      immutableCheck: !__DEV__ ? true : false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
