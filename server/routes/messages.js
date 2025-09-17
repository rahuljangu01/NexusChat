// server/routes/messages.js (FULL & COMPLETE CODE)

const express = require("express");
const { 
    sendMessage, getMessages, markAsRead, editMessage, deleteMessage,
    togglePinMessage, forwardMessage, deleteMultipleMessages
} = require("../controllers/messageController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/send", protect, sendMessage);
router.get("/:userId", protect, getMessages);
router.put("/read/:messageId", protect, markAsRead);
router.put("/edit/:messageId", protect, editMessage);
router.delete("/:messageId", protect, deleteMessage);

router.put("/pin/:messageId", protect, togglePinMessage);
router.post("/forward", protect, forwardMessage);
router.post("/delete-multiple", protect, deleteMultipleMessages);

module.exports = router;