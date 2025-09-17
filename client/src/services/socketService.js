// client/src/services/socketService.js

import io from "socket.io-client";

class SocketService {
  socket = null; // Initialize socket as null

  connect(token) {
    if (this.socket && this.socket.connected) {
      console.log("Socket already connected.");
      return;
    }
    
    // Use the environment variable, but remove the '/api' suffix if it exists
    const API_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || "http://localhost:5000";

    this.socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on("connect", () => console.log("Socket connected:", this.socket.id));
    this.socket.on("disconnect", () => console.log("Socket disconnected"));
    this.socket.on("connect_error", (error) => console.error("Socket connection error:", error.message));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Helper to safely emit events
  emit(eventName, data) {
    if (this.socket) {
      this.socket.emit(eventName, data);
    } else {
      console.warn(`Socket not connected. Cannot emit event: ${eventName}`);
    }
  }

  // --- SAFE EVENT LISTENERS ---
  on(eventName, callback) {
    if (this.socket) {
      this.socket.on(eventName, callback);
    }
  }
  
  off(eventName, callback) {
    if (this.socket) {
      this.socket.off(eventName, callback);
    }
  }

  // --- Specific Event Emitters ---
  joinChat(userId) { this.emit("join-chat", userId); }
  leaveChat(userId) { this.emit("leave-chat", userId); }
  startTyping(receiverId) { this.emit("typing", { receiverId }); }
  stopTyping(receiverId) { this.emit("stop-typing", { receiverId }); }

  // --- Specific Event Listeners ---
  onReceiveMessage(callback) { this.on("receive-message", callback); }
  onUserTyping(callback) { this.on("user-typing", callback); }
  onUserStopTyping(callback) { this.on("user-stop-typing", callback); }
  onUserOnline(callback) { this.on("user-online", callback); }
  onUserOffline(callback) { this.on("user-offline", callback); }
}

export const socketService = new SocketService(); 