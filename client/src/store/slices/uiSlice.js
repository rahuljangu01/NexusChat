import { createSlice } from "@reduxjs/toolkit"

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    loading: false,
    error: null,
    success: null,
    sidebarOpen: false,
    theme: "light",
  },
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
    },
    setSuccess: (state, action) => {
      state.success = action.payload
    },
    clearMessages: (state) => {
      state.error = null
      state.success = null
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setTheme: (state, action) => {
      state.theme = action.payload
    },
  },
})

export const { setLoading, setError, setSuccess, clearMessages, toggleSidebar, setTheme } = uiSlice.actions

export default uiSlice.reducer
