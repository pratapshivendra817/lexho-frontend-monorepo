import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getSubscriptions } from "../api/subscriptionApi";

type SubscriptionState = { list: any[]; loading: boolean; error: string | null };
const initialState: SubscriptionState = { list: [], loading: false, error: null };

export const fetchSubscriptions = createAsyncThunk('subscriptions/fetch', async () => {
  const data = await getSubscriptions();
  return data?.data ?? data ?? [];
});

const slice = createSlice({
  name: 'subscriptions',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchSubscriptions.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(fetchSubscriptions.fulfilled, (s, a) => { s.loading = false; s.list = a.payload; })
     .addCase(fetchSubscriptions.rejected, (s, a) => { s.loading = false; s.error = a.error.message ?? 'Subscription load failed'; });
  }
});

export default slice.reducer;
