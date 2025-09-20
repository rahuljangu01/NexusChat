import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const fetchMyGroups = createAsyncThunk(
  "groups/fetchMyGroups",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/groups/my-groups");
      return res.data.groups;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch groups");
    }
  }
);

const groupsSlice = createSlice({
  name: "groups",
  initialState: {
    myGroups: [],
    loading: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyGroups.pending, (state) => {
        state.loading = 'pending';
      })
      .addCase(fetchMyGroups.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        state.myGroups = action.payload;
      })
      .addCase(fetchMyGroups.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload;
      });
  },
});

export default groupsSlice.reducer;