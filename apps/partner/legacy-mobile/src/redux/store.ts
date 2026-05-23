import { configureStore, combineReducers } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persistReducer, persistStore } from "redux-persist";

import authReducer from "./slices/authSlice";
import partnerReducer from "./slices/partnerSlice";
import orderReducer from "./slices/orderSlice";
import walletReducer from "./slices/walletSlice";
import notificationReducer from "./slices/notificationSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  partner: partnerReducer,
  orders: orderReducer,
  wallet: walletReducer,
  notifications: notificationReducer,
});

const persistedReducer = persistReducer(
  {
    key: "lexho-partner-root",
    storage: AsyncStorage,
    whitelist: ["auth", "partner", "wallet"],
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
