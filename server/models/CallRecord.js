// server/models/CallRecord.js (FINAL & CORRECTED)

const mongoose = require("mongoose");

const callRecordSchema = new mongoose.Schema(
  {
    caller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
    
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    
    callType: {
      type: String,
      enum: ['one-on-one', 'group'],
      required: true
    },
    status: {
      type: String,
      enum: ["answered", "missed", "rejected"],
      required: true,
    },
    duration: {
      type: Number,
      default: 0,
    },
    endedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

callRecordSchema.index({ users: 1, createdAt: -1 });
callRecordSchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model("CallRecord", callRecordSchema);