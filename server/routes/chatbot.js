// server/routes/chatbot.js

const express = require("express");
const { handleMessage } = require("../controllers/chatbotController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// This route will handle messages sent to the chatbot
router.post("/message", protect, handleMessage);

module.exports = router;