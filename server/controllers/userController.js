// server/controllers/userController.js (FINAL & COMPLETE WITH E2EE DEBUG LOGS)

const User = require("../models/User");
const Connection = require("../models/Connection");

// Search users
const searchUsers = async (req, res) => {
  try {
    const { q, department, year, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" });
    }

    const query = {
      _id: { $ne: req.user.id },
    };

    if (q) {
      query.$text = { $search: q };
    }
    if (department) {
      query.department = new RegExp(department, "i");
    }
    if (year) {
      query.year = Number.parseInt(year);
    }

    const users = await User.find(query)
      .select("name email collegeId department year profilePhotoUrl interests isOnline lastSeen")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ score: { $meta: "textScore" }, isOnline: -1, lastSeen: -1 });

    const usersWithConnectionStatus = await Promise.all(
      users.map(async (user) => {
        const connection = await Connection.findOne({
          users: { $all: [req.user.id, user._id] },
        });

        return {
          ...user.toObject(),
          connectionStatus: connection ? connection.status : "none",
          connectionId: connection ? connection._id : null,
        };
      }),
    );

    res.json({
      success: true,
      users: usersWithConnectionStatus,
    });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({ message: "Server error during user search" });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "name email collegeId department year profilePhotoUrl interests isOnline lastSeen",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const connection = await Connection.findOne({
      users: { $all: [req.user.id, user._id] },
    });

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        connectionStatus: connection ? connection.status : "none",
        connectionId: connection ? connection._id : null,
      },
    });
  } catch (error)
   {
    console.error("Get user profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Store a user's public key on the server
const storePublicKey = async (req, res) => {
  try {
    const userId = req.user.id;
    const { publicKey } = req.body;
    
    console.log(`[E2EE] Received request to store public key for user: ${userId}`);

    if (!publicKey) {
      console.log(`[E2EE] Request failed for user ${userId}: Public key is missing.`);
      return res.status(400).json({ message: "Public key is required." });
    }

    const user = await User.findByIdAndUpdate(userId, { publicKey }, { new: true });
    
    if (!user) {
      console.log(`[E2EE] Request failed: User with ID ${userId} not found.`);
      return res.status(404).json({ message: "User not found." });
    }

    console.log(`[E2EE] SUCCESS: Stored public key for user ${user.name} (${userId})`);
    res.status(200).json({ success: true, message: "Public key stored successfully." });
  } catch (error) {
    console.error("[E2EE] FATAL: Error storing public key:", error);
    res.status(500).json({ message: "Server error while storing public key." });
  }
};

// Get another user's public key
const getPublicKey = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`[E2EE] Received request to fetch public key for user: ${userId}`);

    const user = await User.findById(userId).select('publicKey name');

    if (!user || !user.publicKey) {
      console.log(`[E2EE] Request failed: Public key not found for user ${userId}`);
      return res.status(404).json({ message: "Public key not found for this user." });
    }
    
    console.log(`[E2EE] SUCCESS: Found and sending public key for user ${user.name}`);
    res.status(200).json({ success: true, publicKey: user.publicKey });
  } catch (error) {
    console.error("[E2EE] FATAL: Error fetching public key:", error);
    res.status(500).json({ message: "Server error while fetching public key." });
  }
};

module.exports = {
  searchUsers,
  getUserProfile,
  storePublicKey,
  getPublicKey,
};