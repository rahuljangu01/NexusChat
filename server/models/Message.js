// server/models/Message.js (FULL & COMPLETE CODE)

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
    content: {
      type: String,
      required: true,
      maxlength: [2000, "Content cannot exceed 2000 characters"],
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "audio", "sticker"],
      default: "text",
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isPinned: {
      type: Boolean,
      default: false,
    },
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    fileName: { type: String },
    fileSize: { type: Number },
    deliveredAt: { type: Date },
    readAt: { type: Date, default: null },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ group: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);