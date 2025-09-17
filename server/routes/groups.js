// server/routes/groups.js (SAHI CODE)

const express = require("express");
const {
  createGroup,
  getMyGroups,
  discoverPublicGroups, // Yeh import zaroori hai
  getGroupById,
  joinGroup,
  leaveGroup,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
  updateMemberRole,
  sendGroupMessage,
  getGroupMessages,
} = require("../controllers/groupController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// General Group Routes
router.post("/create", protect, createGroup);
router.get("/my-groups", protect, getMyGroups); // YEH ROUTE ZAROORI HAI
router.get("/discover", protect, discoverPublicGroups); // YEH ROUTE BHI ZAROORI HAI

// Specific Group Routes
router.get("/:groupId", protect, getGroupById);
router.put("/:groupId", protect, updateGroup);
router.delete("/:groupId", protect, deleteGroup);
router.post("/:groupId/join", protect, joinGroup);
router.post("/:groupId/leave", protect, leaveGroup);

// Member Management Routes
router.post("/:groupId/members/:userId", protect, addMember);
router.delete("/:groupId/members/:userId", protect, removeMember);
router.put("/:groupId/members/:userId/role", protect, updateMemberRole);

// Messaging Routes
router.post("/:groupId/send", protect, sendGroupMessage);
router.get("/:groupId/messages", protect, getGroupMessages);

module.exports = router;