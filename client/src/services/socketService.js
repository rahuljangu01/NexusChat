// client/src/services/socketService.js (FINAL, DEPLOYMENT-READY)

import io from "socket.io-client";

class SocketService {
  socket = null;

  connect(token) {
    if (this.socket && this.socket.connected) {
      return;
    }
    
    // <<< --- THIS IS THE FIX --- >>>
    // In production, connect to the same domain the app is on.
    // In development, it will connect to localhost:5000 (via the proxy).
    const SOCKET_URL = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : "http://localhost:5000";

    console.log(`[Socket.IO] Connecting to: ${SOCKET_URL}`);

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on("connect", () => console.log("[Socket.IO] Connected with ID:", this.socket.id));
    this.socket.on("disconnect", () => console.log("[Socket.IO] Disconnected"));
    this.socket.on("connect_error", (error) => console.error("[Socket.IO] Connection Error:", error.message));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(eventName, data, callback) {
    if (this.socket) {
      this.socket.emit(eventName, data, callback);
    } else {
      console.warn(`[Socket.IO] Not connected. Cannot emit event: ${eventName}`);
    }
  }
  
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

  joinChat(userId) { this.emit("join-chat", userId); }
  leaveChat(userId) { this.emit("leave-chat", userId); }
  startTyping(receiverId) { this.emit("typing", { receiverId }); }
  stopTyping(receiverId) { this.emit("stop-typing", { receiverId }); }
  onReceiveMessage(callback) { this.on("receive-message", callback); }
  onUserTyping(callback) { this.on("user-typing", callback); }
  onUserStopTyping(callback) { this.on("user-stop-typing", callback); }
  onUserOnline(callback) { this.on("user-online", callback); }
  onUserOffline(callback) { this.on("user-offline", callback); }
}

export const socketService = new SocketService();