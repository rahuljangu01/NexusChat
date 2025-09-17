// client/src/store/store.js

import { configureStore } from "@reduxjs/toolkit";
import authSlice from "./slices/authSlice";
import chatSlice from "./slices/chatSlice";
import uiSlice from "./slices/uiSlice";
import connectionsSlice from "./slices/connectionsSlice"; // <-- IMPORT THE NEW SLICE

export const store = configureStore({
  reducer: {
    auth: authSlice,
    chat: chatSlice,
    ui: uiSlice,
    connections: connectionsSlice, // <-- ADD THE NEW SLICE
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // It's often easier to disable this check
    }),
});