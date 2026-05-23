import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  deleteCustomerProfileImage,
  getCustomerAddresses,
  getCustomerProfileContent,
  getCustomerProfile,
  requestAccountDelete,
  updateCustomerEmail,
  updateCustomerProfile,
  uploadCustomerProfileImage,
} from "../api/customerProfileApi";
import type { CustomerAddress, CustomerProfile, CustomerProfileContent, ImageUploadPayload, ProfileUpdatePayload } from "../modules/profile/types";

type Status = "idle" | "loading" | "success" | "error";

type ProfileState = {
  profile: CustomerProfile | null;
  addresses: CustomerAddress[];
  content: CustomerProfileContent | null;
  status: Status;
  saveStatus: Status;
  imageUploadStatus: Status;
  accountDeleteStatus: Status;
  error: string | null;
  lastUpdatedAt: number | null;
};

const initialState: ProfileState = {
  profile: null,
  addresses: [],
  content: null,
  status: "idle",
  saveStatus: "idle",
  imageUploadStatus: "idle",
  accountDeleteStatus: "idle",
  error: null,
  lastUpdatedAt: null,
};

export const fetchCustomerProfileThunk = createAsyncThunk("customerProfile/fetch", async () => {
  return await getCustomerProfile();
});

export const fetchCustomerAddressesThunk = createAsyncThunk("customerProfile/fetchAddresses", async () => {
  return await getCustomerAddresses();
});

export const fetchCustomerProfileContentThunk = createAsyncThunk("customerProfile/fetchContent", async () => {
  return await getCustomerProfileContent();
});

export const refreshProfileBundleThunk = createAsyncThunk("customerProfile/refreshBundle", async (_, { dispatch }) => {
  await Promise.all([
    dispatch(fetchCustomerProfileThunk()),
    dispatch(fetchCustomerAddressesThunk()),
    dispatch(fetchCustomerProfileContentThunk()),
  ]);
});

export const updateCustomerProfileThunk = createAsyncThunk(
  "customerProfile/update",
  async (payload: ProfileUpdatePayload) => {
    return await updateCustomerProfile(payload);
  },
);

export const updateCustomerEmailThunk = createAsyncThunk("customerProfile/email", async (email: string) => {
  return await updateCustomerEmail({ email });
});

export const uploadCustomerProfileImageThunk = createAsyncThunk(
  "customerProfile/uploadImage",
  async (payload: ImageUploadPayload) => {
    return await uploadCustomerProfileImage(payload);
  },
);

export const deleteCustomerProfileImageThunk = createAsyncThunk("customerProfile/deleteImage", async () => {
  return await deleteCustomerProfileImage();
});

export const requestAccountDeleteThunk = createAsyncThunk("customerProfile/deleteRequest", async () => {
  return await requestAccountDelete();
});

const customerProfileSlice = createSlice({
  name: "customerProfile",
  initialState,
  reducers: {
    setProfileOptimistic(state, action: PayloadAction<Partial<CustomerProfile>>) {
      if (!state.profile) return;
      state.profile = { ...state.profile, ...action.payload };
      state.lastUpdatedAt = Date.now();
    },
    resetProfileError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerProfileThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCustomerProfileThunk.fulfilled, (state, action) => {
        state.status = "success";
        state.profile = action.payload;
        state.lastUpdatedAt = Date.now();
      })
      .addCase(fetchCustomerProfileThunk.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message ?? "Failed to load profile";
      })
      .addCase(fetchCustomerAddressesThunk.fulfilled, (state, action) => {
        state.addresses = action.payload;
      })
      .addCase(fetchCustomerProfileContentThunk.fulfilled, (state, action) => {
        state.content = action.payload;
      })
      .addCase(updateCustomerProfileThunk.pending, (state) => {
        state.saveStatus = "loading";
        state.error = null;
      })
      .addCase(updateCustomerProfileThunk.fulfilled, (state, action) => {
        state.saveStatus = "success";
        state.profile = action.payload;
        state.lastUpdatedAt = Date.now();
      })
      .addCase(updateCustomerProfileThunk.rejected, (state, action) => {
        state.saveStatus = "error";
        state.error = action.error.message ?? "Failed to update profile";
      })
      .addCase(updateCustomerEmailThunk.pending, (state) => {
        state.saveStatus = "loading";
      })
      .addCase(updateCustomerEmailThunk.fulfilled, (state, action) => {
        state.saveStatus = "success";
        state.profile = action.payload;
        state.lastUpdatedAt = Date.now();
      })
      .addCase(updateCustomerEmailThunk.rejected, (state, action) => {
        state.saveStatus = "error";
        state.error = action.error.message ?? "Failed to update email";
      })
      .addCase(uploadCustomerProfileImageThunk.pending, (state) => {
        state.imageUploadStatus = "loading";
      })
      .addCase(uploadCustomerProfileImageThunk.fulfilled, (state, action) => {
        state.imageUploadStatus = "success";
        state.profile = action.payload;
      })
      .addCase(uploadCustomerProfileImageThunk.rejected, (state, action) => {
        state.imageUploadStatus = "error";
        state.error = action.error.message ?? "Failed to upload image";
      })
      .addCase(deleteCustomerProfileImageThunk.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      .addCase(requestAccountDeleteThunk.pending, (state) => {
        state.accountDeleteStatus = "loading";
      })
      .addCase(requestAccountDeleteThunk.fulfilled, (state) => {
        state.accountDeleteStatus = "success";
      })
      .addCase(requestAccountDeleteThunk.rejected, (state, action) => {
        state.accountDeleteStatus = "error";
        state.error = action.error.message ?? "Failed to request account deletion";
      });
  },
});

export const { setProfileOptimistic, resetProfileError } = customerProfileSlice.actions;
export default customerProfileSlice.reducer;
