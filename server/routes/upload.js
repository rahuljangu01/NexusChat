// server/routes/upload.js

const express = require("express");
const { uploadFile } = require("../controllers/uploadController");
const { protect } = require("../middleware/auth");
// FIX: The path should be '../middleware/upload', not '../middleware/upload.js'
const { upload } = require("../middleware/upload");

const router = express.Router();

// The route should be: POST /api/upload/file
router.post("/file", protect, upload.single("file"), uploadFile);

module.exports = router;