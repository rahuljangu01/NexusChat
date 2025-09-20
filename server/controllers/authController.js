// server/controllers/authController.js (FINAL - WITH REAL-TIME PROFILE UPDATE DEBUGGING)

const { validationResult } = require("express-validator");
const User = require("../models/User");
const Connection = require("../models/Connection");
const generateToken = require("../utils/generateToken");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../utils/sendEmail");
const crypto = require("crypto");

// Temporary in-memory storage for OTPs. For production, use a database like Redis.
const verificationCodes = {};

// Step 1: Send Verification Code to Email
const sendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const emailDomain = email.split('@')[1];
    if (emailDomain !== 'lpu.in') {
      return res.status(400).json({ message: "Only @lpu.in email addresses are allowed." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "This email is already registered." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[email] = {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
    };

    await sendVerificationEmail(email, code);

    res.status(200).json({ success: true, message: "Verification code sent to your email." });
  } catch (error) {
    console.error("Send verification error:", error);
    res.status(500).json({ message: "Server error while sending verification code." });
  }
};

// Step 2: Verify the Code and Register the User
const verifyAndRegister = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, collegeId, password, department, year, code } = req.body;
    
    const storedData = verificationCodes[email];
    if (!storedData || storedData.expiresAt < Date.now()) {
      return res.status(400).json({ message: "Verification code is invalid or has expired." });
    }
    if (storedData.code !== code) {
      return res.status(400).json({ message: "Incorrect verification code." });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { collegeId }] });
    if (existingUser) {
        return res.status(400).json({ message: "Email or College ID is already taken." });
    }

    const user = await User.create({ name, email, collegeId, password, department, year });
    delete verificationCodes[email];

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id, name: user.name, email: user.email, collegeId: user.collegeId,
        department: user.department, year: user.year, profilePhotoUrl: user.profilePhotoUrl,
        interests: user.interests,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error during registration." });
  }
};

// Login User
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();
    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: {
        id: user._id, name: user.name, email: user.email, collegeId: user.collegeId,
        department: user.department, year: user.year, profilePhotoUrl: user.profilePhotoUrl,
        interests: user.interests, isOnline: user.isOnline,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// Get Current User
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      success: true,
      user: {
        id: user._id, name: user.name, email: user.email, collegeId: user.collegeId,
        department: user.department, year: user.year, profilePhotoUrl: user.profilePhotoUrl,
        interests: user.interests, isOnline: user.isOnline, lastSeen: user.lastSeen,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Profile
const updateProfile = async (req, res) => {
  try {
    const { name, department, year, interests, profilePhotoUrl } = req.body;
    const userToUpdate = await User.findById(req.user.id);
    if (!userToUpdate) {
      return res.status(404).json({ message: "User not found" });
    }
    if (name) userToUpdate.name = name;
    if (department) userToUpdate.department = department;
    if (year) userToUpdate.year = year;
    if (interests !== undefined) {
      userToUpdate.interests = Array.isArray(interests) ? interests : interests.split(',').map(interest => interest.trim());
    }
    if (profilePhotoUrl) userToUpdate.profilePhotoUrl = profilePhotoUrl;
    
    const updatedUser = await userToUpdate.save();

    const io = req.app.get('io');
    const userSocketMap = io.userSocketMap;
    const connections = await Connection.find({ users: req.user.id, status: 'accepted' }).lean();

    const friendIds = connections.map(c => {
        const friend = c.users.find(id => id.toString() !== req.user.id.toString());
        return friend ? friend.toString() : null;
    }).filter(id => id !== null);

    const userPayload = {
        _id: updatedUser._id.toString(),
        name: updatedUser.name,
        profilePhotoUrl: updatedUser.profilePhotoUrl,
        isOnline: updatedUser.isOnline,
    };

    console.log(`[Profile Update] User ${req.user.name} updated profile. Broadcasting to friends:`, friendIds);

    friendIds.forEach(friendId => {
        const friendSocketId = userSocketMap[friendId];
        if (friendSocketId) {
            console.log(`[Socket Emit] Sending 'connection-profile-updated' to friend ${friendId} via socket ${friendSocketId}`);
            io.to(friendSocketId).emit('connection-profile-updated', userPayload);
        } else {
            console.log(`[Socket Skip] Friend ${friendId} is not online.`);
        }
    });

    res.json({
      success: true,
      message: "Profile updated successfully!",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        collegeId: updatedUser.collegeId,
        department: updatedUser.department,
        year: updatedUser.year,
        profilePhotoUrl: updatedUser.profilePhotoUrl,
        interests: updatedUser.interests,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error during profile update" });
  }
};

// Change Password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long." });
    }
    if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required." });
    }
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    user.password = newPassword;
    await user.save();
    res.json({
      success: true,
      message: "Password updated successfully!",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error during password change" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Security ke liye hum user ko nahi batate ki email exist karta hai ya nahi
      return res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Frontend ke route ka URL
    const resetURL = `${process.env.CLIENT_URL.split(',')[0]}/reset-password/${resetToken}`;

    await sendPasswordResetEmail(user.email, resetURL);

    res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error("Forgot password error:", error);
    // Token aur expiry ko hata do agar email fail ho jaaye
    if (req.user) {
        req.user.passwordResetToken = undefined;
        req.user.passwordResetExpires = undefined;
        await req.user.save({ validateBeforeSave: false });
    }
    res.status(500).json({ message: "Error sending password reset email." });
  }
};

const resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Token is invalid or has expired.' });
    }

    if (!req.body.password || req.body.password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Naye password ke saath naya JWT token bhejo
    const token = generateToken(user._id);
    res.status(200).json({ success: true, token, message: "Password reset successful!" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: 'Error resetting password.' });
  }
};

module.exports = {
  sendVerification,
  verifyAndRegister,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword
};