const User = require("../models/User")
const Connection = require("../models/Connection")

// Search users
const searchUsers = async (req, res) => {
  try {
    const { q, department, year, page = 1, limit = 20 } = req.query

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" })
    }

    const query = {
      _id: { $ne: req.user.id }, // Exclude current user
    }

    // Text search
    if (q) {
      query.$text = { $search: q }
    }

    // Filter by department
    if (department) {
      query.department = new RegExp(department, "i")
    }

    // Filter by year
    if (year) {
      query.year = Number.parseInt(year)
    }

    const users = await User.find(query)
      .select("name email collegeId department year profilePhotoUrl interests isOnline lastSeen")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ score: { $meta: "textScore" }, isOnline: -1, lastSeen: -1 })

    // Get connection status for each user
    const usersWithConnectionStatus = await Promise.all(
      users.map(async (user) => {
        const connection = await Connection.findOne({
          $or: [
            { requestedBy: req.user.id, requestedTo: user._id },
            { requestedBy: user._id, requestedTo: req.user.id },
          ],
        })

        return {
          ...user.toObject(),
          connectionStatus: connection ? connection.status : "none",
          connectionId: connection ? connection._id : null,
        }
      }),
    )

    res.json({
      success: true,
      users: usersWithConnectionStatus,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: await User.countDocuments(query),
      },
    })
  } catch (error) {
    console.error("Search users error:", error)
    res.status(500).json({ message: "Server error during user search" })
  }
}

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "name email collegeId department year profilePhotoUrl interests isOnline lastSeen",
    )

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Get connection status
    const connection = await Connection.findOne({
      $or: [
        { requestedBy: req.user.id, requestedTo: user._id },
        { requestedBy: user._id, requestedTo: req.user.id },
      ],
    })

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        connectionStatus: connection ? connection.status : "none",
        connectionId: connection ? connection._id : null,
      },
    })
  } catch (error) {
    console.error("Get user profile error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

module.exports = {
  searchUsers,
  getUserProfile,
}
