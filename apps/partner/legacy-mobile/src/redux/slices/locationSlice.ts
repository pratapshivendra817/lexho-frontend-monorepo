import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type LocationState = {
  foregroundPermissionGranted: boolean;
  backgroundPermissionGranted: boolean;
  educationalPromptSeen: boolean;
  lastFailure: string | null;
};

const initialState: LocationState = {
  foregroundPermissionGranted: false,
  backgroundPermissionGranted: false,
  educationalPromptSeen: false,
  lastFailure: null,
};

const locationSlice = createSlice({
  name: "location",
  initialState,
  reducers: {
    setForegroundPermissionGranted(state, action: PayloadAction<boolean>) {
      state.foregroundPermissionGranted = action.payload;
    },
    setBackgroundPermissionGranted(state, action: PayloadAction<boolean>) {
      state.backgroundPermissionGranted = action.payload;
    },
    setEducationalPromptSeen(state, action: PayloadAction<boolean>) {
      state.educationalPromptSeen = action.payload;
    },
    setLocationFailure(state, action: PayloadAction<string | null>) {
      state.lastFailure = action.payload;
    },
  },
});

export const locationActions = locationSlice.actions;
export default locationSlice.reducer;

