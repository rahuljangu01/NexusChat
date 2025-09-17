// server/routes/calls.js (Nayi File)

const express = require("express");
const { logCall, getCallHistory, deleteCallRecord, clearCallHistory } = require("../controllers/callController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/log", protect, logCall);
router.get("/history", protect, getCallHistory);
router.delete("/clear", protect, clearCallHistory);
router.delete("/:callId", protect, deleteCallRecord);

module.exports = router;