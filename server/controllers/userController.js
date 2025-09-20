// server/controllers/userController.js (CLEANED - NO E2EE)

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
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const storePublicKey = async (req, res) => {
  try {
    const userId = req.user.id;
    const { publicKey } = req.body;

    if (!publicKey) {
      return res.status(400).json({ message: "Public key is required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.publicKey = publicKey;
    await user.save();

    res.status(200).json({ success: true, message: "Public key stored successfully." });
  } catch (error) {
    console.error("Error storing public key:", error);
    res.status(500).json({ message: "Server error while storing public key." });
  }
};

// Function #2: Kisi doosre user ki public key fetch karna
const getPublicKey = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('publicKey');

    if (!user || !user.publicKey) {
      return res.status(404).json({ message: "Public key not found for this user." });
    }

    res.status(200).json({ success: true, publicKey: user.publicKey });
  } catch (error) {
    console.error("Error fetching public key:", error);
    res.status(500).json({ message: "Server error while fetching public key." });
  }
};

module.exports = {
  searchUsers,
  getUserProfile,
   storePublicKey,
  getPublicKey,
};