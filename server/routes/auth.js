// server/routes/auth.js (FINAL & COMPLETE)

const express = require("express");
const { body } = require("express-validator");
const { 
    sendVerification, 
    verifyAndRegister, 
    login, 
    getMe, 
    updateProfile, 
    changePassword 
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// --- Validation Rules ---
const registerValidation = [
  body("name").trim().isLength({ min: 2, max: 50 }).withMessage("Name must be 2-50 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Please enter a valid email"),
  body("collegeId").trim().isLength({ min: 3, max: 20 }).withMessage("College ID must be 3-20 characters"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("department").trim().isLength({ min: 2, max: 50 }).withMessage("Department is required"),
  body("year").isInt({ min: 1, max: 5 }).withMessage("Year must be between 1 and 5"),
  body("code").isLength({ min: 6, max: 6 }).withMessage("Verification code must be 6 digits"),
];

const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Please enter a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

const emailValidation = [
    body("email").isEmail().normalizeEmail().withMessage("Please enter a valid email"),
];


// --- API Routes ---

// 1. Registration Flow (2-Step)
router.post("/send-verification", emailValidation, sendVerification);
router.post("/register", registerValidation, verifyAndRegister);

// 2. Login Flow
router.post("/login", loginValidation, login);

// 3. Authenticated User Routes (Requires Token)
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);

module.exports = router;