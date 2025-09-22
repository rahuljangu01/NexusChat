const Message = require("../models/Message");
const CallRecord = require("../models/CallRecord");
const Connection = require("../models/Connection");

// Send a new message (Updated for Replies)
exports.sendMessage = async (req, res) => {
  try {
    // <<< --- 'replyToMessageId' ko yahan se nikalein --- >>>
    const { receiverId, content, messageType = "text", fileName, fileSize, replyToMessageId } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !content) {
      return res.status(400).json({ message: "Receiver ID and content are required." });
    }

    const connection = await Connection.findOne({ users: { $all: [senderId, receiverId] }, status: "accepted" });
    if (!connection) {
      return res.status(403).json({ message: "You can only message connected users." });
    }

    let message = await Message.create({ 
        sender: senderId, 
        receiver: receiverId, 
        content, 
        messageType, 
        fileName, 
        fileSize,
        // <<< --- Reply ID ko save karein agar woh मौजूद hai --- >>>
        replyTo: replyToMessageId || null 
    });

    // Populate everything needed for the frontend
    message = await message
        .populate("sender receiver", "name profilePhotoUrl isOnline")
        .populate({
            path: 'replyTo',
            populate: { path: 'sender', select: 'name' }
        });

    const io = req.app.get('io');
    const userSocketMap = io.userSocketMap;
    const receiverSocketId = userSocketMap[receiverId];

    if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive-message", { ...message.toObject(), _type: 'message' });
    }

    res.status(201).json({ success: true, message });
  } catch (error) {
    console.error(`Error in sendMessage from ${req.user.id} to ${req.body.receiverId}:`, error);
    res.status(500).json({ message: "Server error while sending message." });
  }
};

// Get all messages (Updated to populate replies)
exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
    })
      .populate("sender", "name profilePhotoUrl")
      // <<< --- Reply wale message aur uske sender ki details bhi laayein --- >>>
      .populate({
          path: 'replyTo',
          populate: { path: 'sender', select: 'name content messageType' }
      })
      .populate('reactions.user', 'name') // Populate user who reacted
      .sort({ createdAt: 1 })
      .lean();

    const calls = await CallRecord.find({ users: { $all: [currentUserId, userId] }})
      .populate("caller receiver", "name profilePhotoUrl")
      .sort({ createdAt: 1 })
      .lean();

    const combinedHistory = [
        ...messages.map(msg => ({ ...msg, _type: 'message' })),
        ...calls.map(call => ({ ...call, _type: 'call' }))
    ];

    combinedHistory.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({ success: true, messages: combinedHistory });
  } catch (error) {
    console.error(`Error in getMessages for user ${currentUserId}:`, error);
    res.status(500).json({ message: "Server error while fetching messages." });
  }
};


// <<< --- YEH NAYA FUNCTION ADD KAREIN (toggleReaction) --- >>>
exports.toggleReaction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user.id;

        if (!emoji) {
            return res.status(400).json({ message: "Emoji is required." });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found." });
        }

        const reactionIndex = message.reactions.findIndex(
            r => r.user.toString() === userId
        );

        // User ne pehle se react kiya hai
        if (reactionIndex > -1) {
            // Agar same emoji hai, to reaction hata do (unlike)
            if (message.reactions[reactionIndex].emoji === emoji) {
                message.reactions.splice(reactionIndex, 1);
            } else { // Agar alag emoji hai, to update kar do
                message.reactions[reactionIndex].emoji = emoji;
            }
        } else { // User pehli baar react kar raha hai
            message.reactions.push({ emoji, user: userId });
        }

        await message.save();
        
        const populatedMessage = await message.populate('reactions.user', 'name')
            .populate("sender", "name profilePhotoUrl")
            .populate({
                path: 'replyTo',
                populate: { path: 'sender', select: 'name content messageType' }
            });

        // Sabhi clients ko real-time update bhejo
        const io = req.app.get('io');
        const chatPartnerId = message.sender.toString() === userId ? message.receiver.toString() : message.sender.toString();
        const userSocketMap = io.userSocketMap;
        
        const senderSocketId = userSocketMap[message.sender.toString()];
        const receiverSocketId = userSocketMap[message.receiver.toString()];

        if (senderSocketId) io.to(senderSocketId).emit('message-updated', populatedMessage);
        if (receiverSocketId && receiverSocketId !== senderSocketId) io.to(receiverSocketId).emit('message-updated', populatedMessage);


        res.status(200).json({ success: true, message: populatedMessage });
    } catch (error) {
        console.error("Toggle reaction error:", error);
        res.status(500).json({ message: "Server error." });
    }
};

// Mark a message as read by the current user
exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found." });

    if (message.receiver.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to mark this message as read." });
    }

    if (!message.readAt) {
        message.readAt = new Date();
        await message.save();
    }
    
    res.json({ success: true, message: "Message marked as read." });
  } catch (error) {
    console.error(`Error in markAsRead for user ${req.user.id}:`, error);
    res.status(500).json({ message: "Server error." });
  }
};

// Edit a message sent by the current user
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Content is required to edit." });

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found." });

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to edit this message." });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();
    const populatedMessage = await message.populate("sender receiver", "name profilePhotoUrl");

    res.json({ success: true, message: populatedMessage });
  } catch (error) {
    console.error(`Error in editMessage for user ${req.user.id}:`, error);
    res.status(500).json({ message: "Server error." });
  }
};

// Delete a single message sent by the current user
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const result = await Message.findOneAndDelete({ _id: messageId, sender: req.user.id });
    if (!result) return res.status(404).json({ message: "Message not found or you are not authorized to delete it." });

    res.json({ success: true, message: "Message deleted successfully." });
  } catch (error) {
    console.error(`Error in deleteMessage for user ${req.user.id}:`, error);
    res.status(500).json({ message: "Server error." });
  }
};

// Toggle the 'isPinned' status of a message
exports.togglePinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const messageToPin = await Message.findById(messageId);
    if (!messageToPin) return res.status(404).json({ message: "Message not found." });

    const isUserInChat = [messageToPin.sender.toString(), messageToPin.receiver.toString()].includes(req.user.id);
    if (!isUserInChat) return res.status(403).json({ message: "You are not authorized to pin messages in this chat." });

    const currentlyPinned = await Message.findOne({
      $or: [
        { sender: messageToPin.sender, receiver: messageToPin.receiver },
        { sender: messageToPin.receiver, receiver: messageToPin.sender }
      ],
      isPinned: true
    });

    if (currentlyPinned && currentlyPinned._id.toString() !== messageToPin._id.toString()) {
      currentlyPinned.isPinned = false;
      await currentlyPinned.save();
    }

    messageToPin.isPinned = !messageToPin.isPinned;
    await messageToPin.save();

    res.json({ success: true, message: messageToPin });
  } catch (error) {
    console.error(`Error in togglePinMessage for user ${req.user.id}:`, error);
    res.status(500).json({ message: "Server error." });
  }
};

// Forward an existing message to a different user
exports.forwardMessage = async (req, res) => {
  try {
    const { messageId, forwardToUserId } = req.body;
    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) return res.status(404).json({ message: "Original message not found." });

    let newMessage = await Message.create({
      sender: req.user.id,
      receiver: forwardToUserId,
      content: originalMessage.content,
      messageType: originalMessage.messageType,
      fileName: originalMessage.fileName,
      fileSize: originalMessage.fileSize,
      forwardedFrom: originalMessage.sender,
    });
    
    newMessage = await newMessage.populate("sender receiver", "name profilePhotoUrl");

    const io = req.app.get('io');
    const chatRoom = [req.user.id, forwardToUserId].sort().join("-");
    io.to(chatRoom).emit("receive-message", { ...newMessage.toObject(), _type: 'message' });

    res.status(201).json({ success: true, message: newMessage });
  } catch (error) {
    console.error(`Error in forwardMessage for user ${req.user.id}:`, error);
    res.status(500).json({ message: "Server error." });
  }
};

// Delete multiple messages sent by the current user
exports.deleteMultipleMessages = async (req, res) => {
    try {
        const { messageIds } = req.body;
        if (!messageIds || !Array.isArray(messageIds)) {
            return res.status(400).json({ message: "messageIds must be an array." });
        }
        
        await Message.deleteMany({
            _id: { $in: messageIds },
            sender: req.user.id
        });
        res.json({ success: true, message: "Messages deleted successfully." });
    } catch (error) {
        console.error(`Error in deleteMultipleMessages for user ${req.user.id}:`, error);
        res.status(500).json({ message: "Server error." });
    }
};

// Add/Update/Remove a reaction to a message
exports.toggleReaction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user.id;

        if (!emoji) {
            return res.status(400).json({ message: "Emoji is required." });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found." });
        }

        const reactionIndex = message.reactions.findIndex(
            r => r.user.toString() === userId
        );

        if (reactionIndex > -1) {
            if (message.reactions[reactionIndex].emoji === emoji) {
                message.reactions.splice(reactionIndex, 1);
            } else {
                message.reactions[reactionIndex].emoji = emoji;
            }
        } else {
            message.reactions.push({ emoji, user: userId });
        }

        await message.save();
        
        const populatedMessage = await message.populate({ path: 'reactions.user', select: 'name' });
        
        const io = req.app.get('io');
        const chatRoom = [message.sender.toString(), message.receiver.toString()].sort().join('-');
        io.to(chatRoom).emit('message-updated', populatedMessage);

        res.status(200).json({ success: true, message: populatedMessage });
    } catch (error) {
        console.error("Toggle reaction error:", error);
        res.status(500).json({ message: "Server error." });
    }
};

// Get all media (images and files) shared between two users
exports.getSharedMedia = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const mediaMessages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
      messageType: { $in: ["image", "file"] },
    })
      .sort({ createdAt: -1 })
      .select("content messageType fileName createdAt")
      .lean();

    res.json({ success: true, media: mediaMessages });
  } catch (error) {
    console.error(`Error in getSharedMedia for user ${req.user.id}:`, error);
    res.status(500).json({ message: "Server error while fetching shared media." });
  }
};