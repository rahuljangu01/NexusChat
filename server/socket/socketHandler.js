// server/socket/socketHandler.js (100% COMPLETE CODE)

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");

const userSocketMap = {}; // Maps userId to socketId

const socketHandler = (io) => {
  // Make userSocketMap accessible in other parts of the app (like controllers)
  io.userSocketMap = userSocketMap;

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("Authentication error: No token provided"));
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("Authentication error: User not found"));

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      console.error("Socket Auth Error:", error.message);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log(`User ${socket.user.name} connected: ${socket.id}`);
    
    userSocketMap[userId] = socket.id;
    socket.join(userId);

    // Broadcast user online status
    socket.broadcast.emit("user-online", { userId });
    User.findByIdAndUpdate(userId, { isOnline: true }).exec();

    // Mark 'sent' messages as 'delivered' when user comes online
    Message.find({ receiver: userId, status: 'sent' }).distinct('sender').then(senderIds => {
        Message.updateMany(
            { receiver: userId, status: 'sent' },
            { $set: { status: 'delivered', deliveredAt: new Date() } }
        ).then(result => {
            if (result.modifiedCount > 0) {
                senderIds.forEach(senderId => {
                    const senderSocketId = userSocketMap[senderId.toString()];
                    if (senderSocketId) {
                        io.to(senderSocketId).emit('messages-delivered', { chatPartnerId: userId });
                    }
                });
            }
        });
    });

    // --- 1-ON-1 CHAT EVENTS ---
    socket.on("join-chat", (otherUserId) => {
      const chatRoom = [userId, otherUserId].sort().join("-");
      socket.join(chatRoom);
    });

    socket.on('mark-messages-read', async ({ chatUserId }) => {
      try {
        const updateResult = await Message.updateMany(
          { receiver: userId, sender: chatUserId, status: { $ne: 'read' } },
          { $set: { status: 'read', readAt: new Date() } }
        );

        if (updateResult.modifiedCount > 0) {
            const senderSocketId = userSocketMap[chatUserId];
            if (senderSocketId) {
              io.to(senderSocketId).emit('messages-read', { chatPartnerId: userId });
            }
        }
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });
    
    socket.on('typing', (data) => io.to(data.receiverId).emit("user-typing", { userId }));
    socket.on('stop-typing', (data) => io.to(data.receiverId).emit("user-stop-typing", { userId }));

    // --- 1-ON-1 WEBRTC SIGNALING ---
    socket.on("call-user", (data) => {
        const targetSocketId = userSocketMap[data.userToCall];
        if (targetSocketId) {
            io.to(targetSocketId).emit("call-made", { 
                signal: data.signalData, 
                from: data.from, // This is now a full object {id, name, profilePhotoUrl}
                type: data.type 
            });
        }
    });
    socket.on("answer-call", (data) => {
        const targetSocketId = userSocketMap[data.to];
        if (targetSocketId) {
            io.to(targetSocketId).emit("call-accepted", data.signal);
        }
    });
    socket.on("hang-up", (data) => {
        const targetSocketId = userSocketMap[data.to];
        if (targetSocketId) {
            io.to(targetSocketId).emit("call-ended");
        }
    });
    
    // --- GROUP MANAGEMENT ---
    socket.on('join-group-room', (groupId) => {
        socket.join(groupId);
    });
    socket.on('leave-group-room', (groupId) => {
        socket.leave(groupId);
    });

    // --- GROUP CALL LOGIC ---
    socket.on('start-group-call', ({ groupId, from, callType }) => {
        socket.to(groupId).emit('incoming-group-call', { from, groupId, callType });
    });

    socket.on('join-group-call', ({ groupId, from }) => {
        socket.to(groupId).emit('new-user-joined-group-call', { from });
    });
    
    socket.on('return-signal-group', ({ signal, to }) => {
        const targetSocketId = userSocketMap[to];
        if (targetSocketId) {
            io.to(targetSocketId).emit('receiving-returned-signal-group', { signal, from: { id: userId, name: socket.user.name } });
        }
    });
    
    socket.on('leave-group-call', ({ groupId, userId }) => {
        socket.to(groupId).emit('user-left-group-call', { userId });
    });

    socket.on('mark-group-messages-read', async ({ groupId }) => {
      try {
        await Message.updateMany(
          { group: groupId, sender: { $ne: userId }, readBy: { $nin: [userId] } },
          { $addToSet: { readBy: userId } }
        );
      } catch (error) {
        console.error("Error marking group messages as read:", error);
      }
    });

    // --- DISCONNECT LOGIC ---
    socket.on("disconnect", () => {
      console.log(`User ${socket.user.name} disconnected`);
      delete userSocketMap[userId];
      const lastSeenTime = new Date();
      socket.broadcast.emit("user-offline", { userId, lastSeen: lastSeenTime });
      User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: lastSeenTime }).exec();
    });
  });
};

module.exports = socketHandler;