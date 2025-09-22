// client/src/store/chatSlice.js (FULL CODE)

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getMessages as apiGetMessages } from "../../utils/api";

export const getMessages = createAsyncThunk(
  "chat/getMessages", 
  async (userId, { rejectWithValue }) => {
    try {
        const response = await apiGetMessages(userId);
        return response;
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Failed to fetch messages.");
    }
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    messages: {},
    activeChat: null,
    loading: false,
    error: null,
  },
  reducers: {
    addMessage: (state, action) => {
      const { chatId, message } = action.payload;
      if (!state.messages[chatId]) {
        state.messages[chatId] = [];
      }
      const messageExists = state.messages[chatId].some(m => m._id === message._id);
      if (!messageExists) {
        state.messages[chatId].push(message);
      }
    },
    updateMessage: (state, action) => {
        const { chatId, tempId, finalMessage } = action.payload;
        if (state.messages[chatId]) {
            const messageIndex = state.messages[chatId].findIndex(m => m._id === tempId);
            if (messageIndex !== -1) {
                state.messages[chatId][messageIndex] = finalMessage;
            }
        }
    },
    updateSentMessagesStatus: (state, action) => {
      const { chatPartnerId, status } = action.payload;
      if (state.messages[chatPartnerId]) {
        state.messages[chatPartnerId].forEach(msg => {
          if (msg.receiver?._id === chatPartnerId || msg.receiver === chatPartnerId) {
             if (status === 'read') {
                msg.status = 'read';
             } else if (status === 'delivered' && msg.status === 'sent') {
                msg.status = 'delivered';
             }
          }
        });
      }
    }
  },
  updateSingleMessageInChat: (state, action) => {
        const updatedMessage = action.payload;
        // Pata lagao ki yeh message kis chat ka hai
        const chatId = updatedMessage.sender._id === state.activeChat ? updatedMessage.receiver._id : updatedMessage.sender._id;

        if (state.messages[chatId]) {
            const messageIndex = state.messages[chatId].findIndex(m => m._id === updatedMessage._id);
            if (messageIndex !== -1) {
                state.messages[chatId][messageIndex] = updatedMessage;
            }
        }
    },
  extraReducers: (builder) => {
    builder
      .addCase(getMessages.pending, (state, action) => {
        state.loading = true;
        state.activeChat = action.meta.arg; 
      })
      .addCase(getMessages.fulfilled, (state, action) => {
        state.loading = false;
        const { userId, messages } = action.payload;
        state.messages[userId] = messages;
      })
      .addCase(getMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { addMessage, updateMessage, updateSentMessagesStatus, updateSingleMessageInChat } = chatSlice.actions;
export default chatSlice.reducer;