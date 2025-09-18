// client/src/store/slices/connectionsSlice.js (FINAL CORRECTED SYNTAX)

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getMyConnections } from "../../utils/api";

export const fetchConnections = createAsyncThunk(
  "connections/fetchConnections",
  async (currentUserId, { rejectWithValue }) => {
    try {
      const connections = await getMyConnections();
      return { connections, currentUserId };
    } catch (error) { // <<< --- THIS IS THE FIX --- >>>
      return rejectWithValue(error.response?.data?.message || "Failed to fetch connections");
    }
  }
);

const connectionsSlice = createSlice({
  name: "connections",
  initialState: {
    connections: [],
    pendingRequests: [],
    loading: 'idle',
    error: null,
  },
  reducers: {
    setUserOnline: (state, action) => {
      const { userId } = action.payload;
      state.connections = state.connections.map(conn => {
        const userIndex = conn.users.findIndex(u => u?._id === userId);
        if (userIndex === -1) return conn;
        const updatedUser = { ...conn.users[userIndex], isOnline: true };
        const updatedUsers = [...conn.users];
        updatedUsers[userIndex] = updatedUser;
        return { ...conn, users: updatedUsers };
      });
    },
    setUserOffline: (state, action) => {
      const { userId, lastSeen } = action.payload;
      state.connections = state.connections.map(conn => {
        const userIndex = conn.users.findIndex(u => u?._id === userId);
        if (userIndex === -1) return conn;
        const updatedUser = { ...conn.users[userIndex], isOnline: false, lastSeen: lastSeen };
        const updatedUsers = [...conn.users];
        updatedUsers[userIndex] = updatedUser;
        return { ...conn, users: updatedUsers };
      });
    },
    updateConnectionLastMessage: (state, action) => {
      const { chatId, message, currentUserId, currentPath } = action.payload;
      const connectionIndex = state.connections.findIndex(conn => 
        conn.users.some(user => user._id === chatId)
      );

      if (connectionIndex > -1) {
        const connectionToUpdate = { ...state.connections[connectionIndex] };
        
        connectionToUpdate.lastMessage = message;
        
        if (message.sender._id !== currentUserId && !currentPath.includes(chatId)) {
            if (!connectionToUpdate.unreadCount) {
                connectionToUpdate.unreadCount = 0;
            }
            connectionToUpdate.unreadCount += 1;
        }
        
        state.connections.splice(connectionIndex, 1);
        state.connections.unshift(connectionToUpdate);
      }
    },
    setChatWallpaper: (state, action) => {
      const { connectionId, wallpaperUrl } = action.payload;
      const connectionIndex = state.connections.findIndex(c => c._id === connectionId);
      if (connectionIndex !== -1) {
        state.connections[connectionIndex].chatWallpaper = wallpaperUrl;
      }
    },
    clearUnreadCount: (state, action) => {
      const { chatId } = action.payload;
      const connectionIndex = state.connections.findIndex(conn => 
        conn.users.some(user => user._id === chatId)
      );
      if (connectionIndex > -1) {
        state.connections[connectionIndex].unreadCount = 0;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConnections.pending, (state) => {
        state.loading = 'pending';
      })
      .addCase(fetchConnections.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        const { connections, currentUserId } = action.payload;
        
        const acceptedConnections = connections.filter(c => c.status === 'accepted');
        
        acceptedConnections.sort((a, b) => {
            const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.updatedAt || 0);
            const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.updatedAt || 0);
            return timeB - timeA;
        });

        state.connections = acceptedConnections;
        state.pendingRequests = connections.filter(c => c.status === 'pending' && c.requestedTo === currentUserId);
      })
      .addCase(fetchConnections.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload;
      });
  },
});

// We no longer need incrementUnreadCount, so it's removed from the export
export const { setUserOnline, setUserOffline, updateConnectionLastMessage, setChatWallpaper, clearUnreadCount } = connectionsSlice.actions;
export default connectionsSlice.reducer;