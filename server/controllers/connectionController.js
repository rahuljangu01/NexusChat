// server/controllers/connectionController.js (FINAL & ENHANCED)

const Connection = require("../models/Connection");
const User = require("../models/User");
const Message = require("../models/Message");

// Send connection request
const sendConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.id;

    if (userId === requesterId) {
      return res.status(400).json({ message: "Cannot send request to yourself" });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingConnection = await Connection.findOne({
      users: { $all: [requesterId, userId] },
    });

    if (existingConnection) {
      return res.status(400).json({ message: "A connection or request already exists with this user." });
    }

    const connection = await Connection.create({
      users: [requesterId, userId],
      requestedBy: requesterId,
      requestedTo: userId,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      connection,
      message: "Connection request sent successfully",
    });
  } catch (error) {
    console.error("Send connection request error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Accept a connection request
const acceptConnection = async (req, res) => {
  try {
    const { connectionId } = req.params;

    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({ message: "Connection not found" });
    }

    if (connection.requestedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to accept this request" });
    }

    connection.status = "accepted";
    await connection.save();

    res.json({
      success: true,
      message: "Connection accepted successfully",
    });
  } catch (error) {
    console.error("Accept connection error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Reject or Cancel a connection request
const rejectConnection = async (req, res) => {
  try {
    const { connectionId } = req.params;

    const connection = await Connection.findOneAndDelete({
      _id: connectionId,
      users: req.user.id,
      status: 'pending'
    });

    if (!connection) {
        return res.status(404).json({ message: "Pending request not found or you are not authorized." });
    }

    res.json({
      success: true,
      message: "Connection request removed.",
    });
  } catch (error) {
    console.error("Reject connection error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove an existing connection (Unfriend)
const removeConnection = async (req, res) => {
  try {
    const { connectionId } = req.params;

    const connection = await Connection.findOneAndDelete({
      _id: connectionId,
      users: req.user.id,
      status: 'accepted'
    });

    if (!connection) {
      return res.status(404).json({ message: "Connection not found or you are not authorized." });
    }

    res.json({
      success: true,
      message: "Connection removed successfully.",
    });
  } catch (error) {
    console.error("Remove connection error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Block a user
const blockUser = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({ message: "Connection not found" });
    }
    if (!connection.users.includes(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to block this connection" });
    }
    connection.status = "blocked";
    await connection.save();
    res.json({
      success: true,
      message: "User blocked successfully",
    });
  } catch (error) {
    console.error("Block user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all of the current user's connections
const getMyConnections = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const connections = await Connection.find({
      users: currentUserId,
      status: { $in: ["accepted", "pending"] }, 
    })
      .populate({ path: "users", select: "name department profilePhotoUrl isOnline email collegeId" })
      .populate({ path: "requestedBy", select: "name department profilePhotoUrl isOnline email collegeId" })
      .lean();

    const connectionsWithDetails = await Promise.all(
      connections.map(async (connection) => {
        if (connection.status === 'pending') {
          return { ...connection, lastMessage: null, unreadCount: 0 };
        }
        
        const otherUser = connection.users.find(u => u._id.toString() !== currentUserId);
        if (!otherUser) return connection;

        const lastMessage = await Message.findOne({
          $or: [
            { sender: currentUserId, receiver: otherUser._id },
            { sender: otherUser._id, receiver: currentUserId },
          ]
        }).sort({ createdAt: -1 }).lean();

        const unreadCount = await Message.countDocuments({
          sender: otherUser._id,
          receiver: currentUserId,
          status: { $ne: 'read' }
        });

        return { ...connection, lastMessage, unreadCount };
      })
    );
    
    connectionsWithDetails.sort((a, b) => {
        const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.updatedAt);
        const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.updatedAt);
        return timeB - timeA;
    });

    res.json({
      success: true,
      connections: connectionsWithDetails,
    });
  } catch (error) {
    console.error("Get connections error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update chat wallpaper for a connection
const updateChatWallpaper = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { wallpaperUrl } = req.body;
    const userId = req.user.id;

    const connection = await Connection.findOne({
      _id: connectionId,
      users: userId,
      status: 'accepted'
    });

    if (!connection) {
      return res.status(404).json({ message: "Connection not found or you are not authorized." });
    }

    connection.chatWallpaper = wallpaperUrl || '';
    await connection.save();
    
    const otherUser = connection.users.find(u => u.toString() !== userId);
    const io = req.app.get('io');
    const userSocketMap = io.userSocketMap;
    const otherUserSocketId = userSocketMap[otherUser.toString()];
    
    if (otherUserSocketId) {
      io.to(otherUserSocketId).emit('wallpaper-changed', {
        connectionId: connection._id,
        wallpaperUrl: connection.chatWallpaper
      });
    }

    res.json({
      success: true,
      message: "Chat wallpaper updated successfully.",
      connection,
    });
  } catch (error) {
    console.error("Update wallpaper error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  sendConnectionRequest,
  acceptConnection,
  rejectConnection,
  removeConnection,
  blockUser,
  getMyConnections,
  updateChatWallpaper,
};