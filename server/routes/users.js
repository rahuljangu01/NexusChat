const express = require("express")
const { searchUsers, getUserProfile } = require("../controllers/userController")
const { protect } = require("../middleware/auth")

const router = express.Router()

router.get("/search", protect, searchUsers)
router.get("/:userId", protect, getUserProfile)

module.exports = router
