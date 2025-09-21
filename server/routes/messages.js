// server/routes/messages.js (CORRECTED IMPORT)

const express = require("express");
const { 
    sendMessage, getMessages, markAsRead, editMessage, deleteMessage,
    togglePinMessage, forwardMessage, deleteMultipleMessages,
    toggleReaction, // toggleReaction ko bhi import karo
    getSharedMedia // <<< --- YEH IMPORT ADD KARO --- >>>
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

router.post("/react/:messageId", protect, toggleReaction);

// Yeh route ab sahi se kaam karega
router.get("/:userId/media", protect, getSharedMedia);

module.exports = router;