import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import homeReducer from "./homeSlice";
import bookingReducer from "./bookingSlice";
import addressReducer from "./addressSlice";
import cartReducer from "./cartSlice";
import favoritesReducer from "./favoritesSlice";
import serviceReducer from "./serviceSlice";
import locationReducer from "./locationSlice";
import customerProfileReducer from "./customerProfileSlice";
import { callingReducer } from "../modules/calling";
import analyticsReducer from "./analyticsSlice";
import notificationReducer from "./notificationSlice";
import trackingReducer from "./trackingSlice";
import offlineReducer from "./offlineSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    home: homeReducer,
    booking: bookingReducer,
    address: addressReducer,
    cart: cartReducer,
    favorites: favoritesReducer,
    service: serviceReducer,
    location: locationReducer,
    customerProfile: customerProfileReducer,
    calling: callingReducer,
    analytics: analyticsReducer,
    notification: notificationReducer,
    tracking: trackingReducer,
    offline: offlineReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: !__DEV__ ? true : false,
      immutableCheck: !__DEV__ ? true : false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
