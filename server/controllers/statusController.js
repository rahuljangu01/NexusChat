// server/controllers/statusController.js (UPDATED & ENHANCED)

const Status = require('../models/Status');
const Connection = require('../models/Connection');
const mongoose = require('mongoose');

// Create a new status
const createStatus = async (req, res) => {
    const { mediaUrl, mediaType, caption } = req.body;
    if (!mediaUrl) {
        return res.status(400).json({ message: "Media URL is required." });
    }
    try {
        const newStatus = await Status.create({
            user: req.user.id,
            mediaUrl,
            mediaType,
            caption
        });
        res.status(201).json({ success: true, status: newStatus });
    } catch (error) {
        console.error(`Error in createStatus for user ${req.user.id}:`, error);
        res.status(500).json({ message: "Server error while creating status." });
    }
};

// Get statuses from the user's connections (friends) and self
const getFriendsStatuses = async (req, res) => {
    try {
        const connections = await Connection.find({ users: req.user.id, status: 'accepted' });
        const friendIds = connections.map(c => c.users.find(id => id.toString() !== req.user.id)).filter(Boolean);
        const userIdsToFetch = [new mongoose.Types.ObjectId(req.user.id), ...friendIds];

        const statuses = await Status.find({ 
            user: { $in: userIdsToFetch },
            expiresAt: { $gt: new Date() }
        })
            .populate('user', 'name profilePhotoUrl')
            // --- ENHANCEMENT: Populate viewer details directly in the query ---
            .populate({
                path: 'viewers.user',
                select: 'name profilePhotoUrl'
            })
            .sort({ 'user.createdAt': -1, createdAt: -1 }); // Sort by user, then by status time

        // Filter out any statuses where the user might have been deleted
        const validStatuses = statuses.filter(status => status.user);

        const groupedStatuses = validStatuses.reduce((acc, status) => {
            const userId = status.user._id.toString();
            if (!acc[userId]) {
                acc[userId] = { user: status.user, statuses: [] };
            }
            acc[userId].statuses.push(status);
            return acc;
        }, {});
        
        res.json({ success: true, statuses: Object.values(groupedStatuses) });
    } catch (error) {
        console.error(`Error in getFriendsStatuses for user ${req.user.id}:`, error);
        res.status(500).json({ message: "Server error while fetching statuses." });
    }
};

// Mark a status as viewed by the current user
const viewStatus = async (req, res) => {
    try {
        const { statusId } = req.params;
        const userId = req.user.id;

        const status = await Status.findById(statusId);
        if (!status) {
            return res.status(404).json({ message: "Status not found." });
        }

        // Prevent owner from "viewing" their own status in the viewers list
        if (status.user.toString() === userId) {
            return res.status(200).json({ success: true, message: "Owner cannot view own status." });
        }

        // Add the current user to the 'viewers' array if they are not already in it
        const alreadyViewed = status.viewers.some(v => v.user.toString() === userId);
        if (!alreadyViewed) {
            await Status.findByIdAndUpdate(statusId, {
                $push: { viewers: { user: userId, viewedAt: new Date() } }
            });
        }

        res.json({ success: true, message: "Status viewed." });
    } catch (error) {
        console.error(`Error in viewStatus for user ${userId} and status ${req.params.statusId}:`, error);
        res.status(500).json({ message: "Server error while viewing status." });
    }
};

// Like or Unlike a status
const likeStatus = async (req, res) => {
    try {
        const { statusId } = req.params;
        const userId = req.user.id;

        const status = await Status.findById(statusId);
        if (!status) return res.status(404).json({ message: "Status not found." });

        const likeIndex = status.likes.indexOf(userId);
        if (likeIndex > -1) {
            status.likes.splice(likeIndex, 1); // Unlike
        } else {
            status.likes.push(userId); // Like
        }
        
        await status.save();
        res.json({ success: true, likes: status.likes });
    } catch (error) {
        console.error(`Error in likeStatus for user ${userId} and status ${statusId}:`, error);
        res.status(500).json({ message: "Server error while liking status." });
    }
};

// Delete a status (only the owner can delete)
const deleteStatus = async (req, res) => {
    try {
        const { statusId } = req.params;
        
        const result = await Status.findOneAndDelete({ _id: statusId, user: req.user.id });
        
        if (!result) return res.status(404).json({ message: "Status not found or you are not authorized to delete it." });
        
        res.json({ success: true, message: "Status deleted successfully." });
    } catch (error) {
        console.error(`Error in deleteStatus for user ${req.user.id} and status ${statusId}:`, error);
        res.status(500).json({ message: "Server error while deleting status." });
    }
};

module.exports = {
    createStatus,
    getFriendsStatuses,
    viewStatus,
    likeStatus,
    deleteStatus
};