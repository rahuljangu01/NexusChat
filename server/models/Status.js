// server/models/Status.js (UPDATED)

const mongoose = require("mongoose");

const viewerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  viewedAt: { type: Date, default: Date.now },
}, { _id: false }); // _id: false to prevent extra IDs on subdocuments

const statusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mediaUrl: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  caption: { type: String, maxlength: 200 },
  viewers: [viewerSchema], // Use the new sub-schema
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24 hours
    index: { expires: '24h' },
  },
}, { timestamps: true });

module.exports = mongoose.model("Status", statusSchema);