// server/socket/socketHandler.js (FINAL & CORRECTED)

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");
const Connection = require("../models/Connection"); // Ensure Connection is imported

const userSocketMap = {}; // Maps userId to socketId

const socketHandler = (io) => {
  io.userSocketMap = userSocketMap;

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

    socket.broadcast.emit("user-online", { userId });
    User.findByIdAndUpdate(userId, { isOnline: true }).exec();

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
    socket.on('profile-update', async (updatedUser) => {
    try {
        const connections = await Connection.find({ users: userId, status: 'accepted' });
        const friendIds = connections.map(c => c.users.find(id => id.toString() !== userId).toString());

        friendIds.forEach(friendId => {
            const friendSocketId = userSocketMap[friendId];
            if (friendSocketId) {
                io.to(friendSocketId).emit('connection-profile-updated', updatedUser);
            }
        });
    } catch (error) {
        console.error('Error broadcasting profile a`date:', error);
    }
});
    
    socket.on('typing', (data) => io.to(data.receiverId).emit("user-typing", { userId }));
    socket.on('stop-typing', (data) => io.to(data.receiverId).emit("user-stop-typing", { userId }));
    
    socket.on('send-message', async (data, callback) => {
        try {
            const { receiverId, content, messageType = "text", tempId, fileName, fileSize } = data;
            const senderId = socket.userId;
            const connection = await Connection.findOne({ users: { $all: [senderId, receiverId] }, status: "accepted" });
            if (!connection) {
                return callback({ error: "You can only message connected users." });
            }
            let message = await Message.create({ sender: senderId, receiver: receiverId, content, messageType, fileName, fileSize });
            message = await message.populate("sender receiver", "name profilePhotoUrl isOnline");
            const receiverSocketId = userSocketMap[receiverId];
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("receive-message", { ...message.toObject(), _type: 'message' });
            }
            callback({ message: { ...message.toObject(), _type: 'message' } });
        } catch (error) {
            console.error(`Error in socket send-message from ${socket.userId}:`, error);
            callback({ error: "Server error while sending message." });
        }
    });

    socket.on("call-user", (data) => {
        const targetSocketId = userSocketMap[data.userToCall];
        if (targetSocketId) {
            io.to(targetSocketId).emit("call-made", { 
                signal: data.signalData, 
                from: data.from,
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
    
    socket.on('join-group-room', (groupId) => { socket.join(groupId); });
    socket.on('leave-group-room', (groupId) => { socket.leave(groupId); });
    socket.on('start-group-call', ({ groupId, from, callType }) => { socket.to(groupId).emit('incoming-group-call', { from, groupId, callType }); });
    socket.on('join-group-call', ({ groupId, from }) => { socket.to(groupId).emit('new-user-joined-group-call', { from }); });
    socket.on('return-signal-group', ({ signal, to }) => {
        const targetSocketId = userSocketMap[to];
        if (targetSocketId) {
            io.to(targetSocketId).emit('receiving-returned-signal-group', { signal, from: { id: userId, name: socket.user.name } });
        }
    });
    socket.on('leave-group-call', ({ groupId, userId }) => { socket.to(groupId).emit('user-left-group-call', { userId }); });
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