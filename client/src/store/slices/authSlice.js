// client/src/store/slices/authSlice.js (SAHI CODE)

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import api, { uploadProfilePhoto } from "../../utils/api";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// --- Async Thunks ---
export const loginUser = createAsyncThunk("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, credentials);
    localStorage.setItem("token", response.data.token);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Login failed");
  }
});

export const registerUser = createAsyncThunk("auth/register", async (userData, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, userData);
    localStorage.setItem("token", response.data.token);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Registration failed");
  }
});

export const getCurrentUser = createAsyncThunk("auth/getCurrentUser", async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token found");
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    localStorage.removeItem("token");
    return rejectWithValue(error.response?.data?.message || "Failed to get user");
  }
});

export const uploadAndUpdateProfilePhoto = createAsyncThunk(
  "auth/uploadPhoto",
  async (file, { dispatch, rejectWithValue }) => {
    try {
      const uploadedFile = await uploadProfilePhoto(file);
      const profilePhotoUrl = uploadedFile.url;
      const updatedUserData = await dispatch(updateUserProfile({ profilePhotoUrl })).unwrap();
      return updatedUserData;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Upload failed");
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  "auth/updateProfile",
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await api.put(`/auth/profile`, profileData);
      return response.data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Update failed");
    }
  }
);

// --- Slice Definition ---
const initialState = {
  user: null,
  token: localStorage.getItem("token"),
  isAuthenticated: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem("token");
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginUser.fulfilled, (state, action) => { state.loading = false; state.isAuthenticated = true; state.user = action.payload.user; state.token = action.payload.token; })
      .addCase(loginUser.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      // Register
      .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(registerUser.fulfilled, (state, action) => { state.loading = false; state.isAuthenticated = true; state.user = action.payload.user; state.token = action.payload.token; })
      .addCase(registerUser.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      // Get current user
      .addCase(getCurrentUser.fulfilled, (state, action) => { state.isAuthenticated = true; state.user = action.payload.user; })
      .addCase(getCurrentUser.rejected, (state) => { state.isAuthenticated = false; state.user = null; state.token = null; })
      // Update profile
      .addCase(updateUserProfile.pending, (state) => { state.loading = true; })
      .addCase(updateUserProfile.fulfilled, (state, action) => { state.loading = false; state.user = { ...state.user, ...action.payload }; })
      .addCase(updateUserProfile.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      // Upload photo
      .addCase(uploadAndUpdateProfilePhoto.pending, (state) => { state.loading = true; })
      .addCase(uploadAndUpdateProfilePhoto.fulfilled, (state, action) => { state.loading = false; state.user = action.payload; })
      .addCase(uploadAndUpdateProfilePhoto.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;