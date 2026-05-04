import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type User = { id: string; name?: string; mobile?: string; email?: string; avatar?: string };

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  hydrated: boolean;
};

const initialState: AuthState = {
  token: null,
  refreshToken: null,
  user: null,
  hydrated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<{ token: string; refreshToken?: string | null; user?: User | null }>) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken ?? null;
      state.user = action.payload.user ?? null;
    },
    clearSessionState: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
    },
    setHydrated: (state, action: PayloadAction<boolean>) => {
      state.hydrated = action.payload;
    },
  },
});

export const { setSession, clearSessionState, setHydrated } = authSlice.actions;
export default authSlice.reducer;
