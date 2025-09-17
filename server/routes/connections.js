// server/routes/connections.js

const express = require("express");
const {
  sendConnectionRequest,
  acceptConnection,
  rejectConnection,
  getMyConnections,
  blockUser,
  removeConnection,
  updateChatWallpaper, // <-- Import the new controller
} = require("../controllers/connectionController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/send-request/:userId", protect, sendConnectionRequest);
router.put("/accept/:connectionId", protect, acceptConnection);
router.put("/reject/:connectionId", protect, rejectConnection);
router.put("/block/:connectionId", protect, blockUser);
router.get("/me", protect, getMyConnections);
router.delete("/remove/:connectionId", protect, removeConnection);
router.put("/:connectionId/wallpaper", protect, updateChatWallpaper); // <-- Add the new route

module.exports = router;