import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getFavorites } from "../api/favoritesApi";

type FavoritesState = { list: any[]; loading: boolean; error: string | null };
const initialState: FavoritesState = { list: [], loading: false, error: null };

export const fetchFavorites = createAsyncThunk('favorites/fetch', async () => {
  const data = await getFavorites();
  return data;
});

const slice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchFavorites.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(fetchFavorites.fulfilled, (s, a) => { s.loading = false; s.list = a.payload; })
     .addCase(fetchFavorites.rejected, (s, a) => { s.loading = false; s.error = a.error.message ?? 'Favorites load failed'; });
  }
});

export default slice.reducer;


