import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getBookingsHistory } from "../api/bookingApi";

type BookingState = {
  loading: boolean;
  error: string | null;
  history: any[];
};

const initialState: BookingState = {
  loading: false,
  error: null,
  history: [],
};

export const fetchBookingHistory = createAsyncThunk("booking/history", async () => {
  const response = await getBookingsHistory();
  return response;
});

const bookingSlice = createSlice({
  name: "booking",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBookingHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookingHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload;
      })
      .addCase(fetchBookingHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to load bookings";
      });
  },
});

export default bookingSlice.reducer;
