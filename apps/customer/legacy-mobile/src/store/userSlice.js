import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  token: null,
  user: null,
  role: null,
  userId: null,
  locationLabel: "Sector 18, Noida",
  notificationsCount: 2,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setSession(state, action) {
      const payload = action.payload || {};
      const user = payload.user || payload.customer || payload.profile || null;
      state.token =
        payload.token ||
        payload.accessToken ||
        payload.authToken ||
        payload.result?.token ||
        payload.result?.accessToken ||
        payload.data?.token ||
        payload.data?.accessToken ||
        null;
      state.role = String(
        payload.role ||
          payload.userRole ||
          payload.accountType ||
          payload.result?.role ||
          payload.result?.userRole ||
          payload.data?.role ||
          payload.data?.userRole ||
          user?.role ||
          user?.userRole ||
          "CUSTOMER"
      ).toUpperCase();
      state.user = user;
      state.userId =
        payload.userId ||
        payload.customerId ||
        user?.id ||
        user?._id ||
        user?.userId ||
        user?.customerId ||
        null;
    },
    clearUserSession(state) {
      state.token = null;
      state.user = null;
      state.role = null;
      state.userId = null;
    },
    setLocationLabel(state, action) {
      state.locationLabel = action.payload;
    },
    setNotificationsCount(state, action) {
      state.notificationsCount = action.payload;
    },
  },
});

export const {
  setSession,
  clearUserSession,
  setLocationLabel,
  setNotificationsCount,
} = userSlice.actions;

export default userSlice.reducer;
