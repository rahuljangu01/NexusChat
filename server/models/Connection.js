// server/models/Connection.js

const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema(
  {
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "blocked"],
      default: "pending",
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // <<< --- NEW FIELD ADDED --- >>>
    chatWallpaper: {
      type: String,
      default: '', // Default is an empty string for the default pattern
    },
  },
  {
    timestamps: true,
  }
);

connectionSchema.pre('save', function(next) {
  if (this.isNew) {
    this.users.sort();
  }
  next();
});

connectionSchema.index({ users: 1 });

module.exports = mongoose.model("Connection", connectionSchema);