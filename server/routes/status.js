// server/routes/status.js (FINAL & CORRECT)

const express = require("express");
const { 
    createStatus, 
    getFriendsStatuses, 
    viewStatus, 
    likeStatus, 
    deleteStatus 
} = require("../controllers/statusController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/create", protect, createStatus);
router.get("/", protect, getFriendsStatuses);
router.put("/view/:statusId", protect, viewStatus);
router.put("/like/:statusId", protect, likeStatus);
router.delete("/:statusId", protect, deleteStatus);

module.exports = router;