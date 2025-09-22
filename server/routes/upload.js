// server/routes/upload.js (REVERTED TO SIMPLE UPLOAD)

const express = require("express");
const { uploadFile } = require("../controllers/uploadController"); // uploadFile ko wapas use karo
const { protect } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();

// Route ko wapas '/file' kar do
router.post("/file", protect, upload.single("file"), uploadFile);

module.exports = router;