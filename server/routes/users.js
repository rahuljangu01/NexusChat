// server/routes/users.js

const express = require("express");
const { 
  searchUsers, 
  getUserProfile,
  storePublicKey,
  getPublicKey
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/search", protect, searchUsers);
router.get("/:userId", protect, getUserProfile);

// <<< --- YEH DO NAYE ROUTES ADD KARO --- >>>
router.post("/public-key", protect, storePublicKey);
router.get("/:userId/public-key", protect, getPublicKey);

module.exports = router;