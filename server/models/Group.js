const mongoose = require("mongoose")

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      maxlength: [50, "Group name cannot exceed 50 characters"],
    },
    description: {
      type: String,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    avatar: {
      type: String,
      default: "",
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["admin", "moderator", "member"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    maxMembers: {
      type: Number,
      default: 100,
      max: [500, "Group cannot have more than 500 members"],
    },
  },
  {
    timestamps: true,
  },
)

// Index for search functionality
groupSchema.index({ name: "text", description: "text" })
groupSchema.index({ "members.user": 1 })

module.exports = mongoose.model("Group", groupSchema)
