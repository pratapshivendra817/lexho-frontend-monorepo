import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type WalletState = {
  todayEarnings: number;
  totalEarnings: number;
};

const initialState: WalletState = {
  todayEarnings: 0,
  totalEarnings: 0,
};

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    setWalletSnapshot: (state, action: PayloadAction<WalletState>) => {
      state.todayEarnings = action.payload.todayEarnings;
      state.totalEarnings = action.payload.totalEarnings;
    },
  },
});

export const { setWalletSnapshot } = walletSlice.actions;
export default walletSlice.reducer;
