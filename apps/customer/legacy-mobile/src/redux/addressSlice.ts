import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getAddressList } from "../api/addressApi";

type AddressState = { list: any[]; loading: boolean; error: string | null };
const initialState: AddressState = { list: [], loading: false, error: null };

export const fetchAddresses = createAsyncThunk('address/fetch', async () => {
  const data = await getAddressList();
  return data;
});

const slice = createSlice({
  name: 'address',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchAddresses.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(fetchAddresses.fulfilled, (s, a) => { s.loading = false; s.list = a.payload; })
     .addCase(fetchAddresses.rejected, (s, a) => { s.loading = false; s.error = a.error.message ?? 'Address load failed'; });
  }
});

export default slice.reducer;
