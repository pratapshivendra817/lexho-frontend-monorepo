import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type UserInfo = {
  id: string;
  mobile: string;
  name?: string;
};

type AuthState = {
  token: string | null;
  user: UserInfo | null;
  hydrated: boolean;
};

const initialState: AuthState = {
  token: null,
  user: null,
  hydrated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<{ token: string; user: UserInfo }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    clearSession(state) {
      state.token = null;
      state.user = null;
    },
    setHydrated(state, action: PayloadAction<boolean>) {
      state.hydrated = action.payload;
    },
  },
});

export const { setSession, clearSession, setHydrated } = authSlice.actions;
export default authSlice.reducer;

