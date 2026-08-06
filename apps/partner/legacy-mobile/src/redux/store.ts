import { configureStore, combineReducers } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persistReducer, persistStore } from "redux-persist";

import authReducer from "./slices/authSlice";
import partnerReducer from "./slices/partnerSlice";
import orderReducer from "./slices/orderSlice";
import walletReducer from "./slices/walletSlice";
import notificationReducer from "./slices/notificationSlice";
import chatReducer from "./slices/chatSlice";
import { callingReducer } from "../modules/calling";
import callReducer from "./slices/callSlice";
import { navigationReducer, trackingReducer } from "../modules/navigation";
import analyticsReducer from "./slices/analyticsSlice";
import locationReducer from "./slices/locationSlice";
import offlineReducer from "./slices/offlineSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  partner: partnerReducer,
  orders: orderReducer,
  wallet: walletReducer,
  notifications: notificationReducer,
  chat: chatReducer,
  calling: callingReducer,
  calls: callReducer,
  partnerNavigation: navigationReducer,
  partnerTracking: trackingReducer,
  analytics: analyticsReducer,
  location: locationReducer,
  offline: offlineReducer,
});

const persistedReducer = persistReducer(
  {
    key: "lexho-partner-root",
    storage: AsyncStorage,
    whitelist: ["auth", "partner", "wallet", "partnerNavigation", "partnerTracking", "analytics", "location", "offline"],
  },
  rootReducer,
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
