// server/controllers/groupController.js (COMPLETE CODE WITH ALL FUNCTIONS IMPLEMENTED)

const Group = require("../models/Group");
const User = require("../models/User");
const Message = require("../models/Message");
const mongoose = require('mongoose');

// Create a new group and add initial members
const createGroup = async (req, res) => {
  try {
    const { name, description, isPrivate = false, maxMembers = 100, members = [], avatar } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: "Group name must be at least 2 characters" });
    }

    const memberList = [{
        user: req.user.id,
        role: "admin",
        joinedAt: new Date(),
    }];

    const creatorIdString = req.user.id.toString();
    if (members && members.length > 0) {
        members.forEach(memberId => {
            if (memberId !== creatorIdString) {
                memberList.push({ user: memberId, role: "member", joinedAt: new Date() });
            }
        });
    }

    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || "",
      createdBy: req.user.id,
      isPrivate,
      maxMembers,
      members: memberList,
      avatar: avatar || "",
    });

    await group.populate("members.user createdBy", "name email profilePhotoUrl");

    res.status(201).json({
      success: true,
      group,
      message: "Group created successfully",
    });
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({ message: "Server error during group creation" });
  }
};

// Get all groups the current user is a member of
const getMyGroups = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const groups = await Group.find({ "members.user": currentUserId })
      .populate("members.user", "name profilePhotoUrl")
      .populate("createdBy", "name profilePhotoUrl")
      .sort({ updatedAt: -1 })
      .lean();

    const groupsWithDetails = await Promise.all(
      groups.map(async (group) => {
        const unreadCount = await Message.countDocuments({
          group: group._id,
          sender: { $ne: currentUserId },
          readBy: { $nin: [currentUserId] }
        });
        return { ...group, unreadCount };
      })
    );

    res.json({ success: true, groups: groupsWithDetails });
  } catch (error) {
    console.error("Get my groups error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Discover public groups that the user is not yet a member of
const discoverPublicGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      isPrivate: false,
      "members.user": { $ne: req.user.id },
    })
      .populate("members.user", "name profilePhotoUrl")
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, groups });
  } catch (error) {
    console.error("Discover groups error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get a specific group's details by its ID
const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId)
        .populate("members.user", "name profilePhotoUrl isOnline lastSeen")
        .populate("createdBy", "name profilePhotoUrl");

    if (!group) return res.status(404).json({ message: "Group not found" });

    const isMember = group.members.some((member) => member.user._id.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ message: "You are not a member of this group" });

    res.json({ success: true, group });
  } catch (error) {
    console.error("Get group by ID error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Join a public group
const joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.members.some((member) => member.user.toString() === req.user.id)) return res.status(400).json({ message: "You are already a member of this group" });
    if (group.members.length >= group.maxMembers) return res.status(400).json({ message: "Group is full" });

    group.members.push({ user: req.user.id, role: "member", joinedAt: new Date() });
    await group.save();
    await group.populate("members.user", "name profilePhotoUrl");
    res.json({ success: true, group, message: "Successfully joined the group" });
  } catch (error) {
    console.error("Join group error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Leave a group
const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const memberIndex = group.members.findIndex((member) => member.user.toString() === req.user.id);
    if (memberIndex === -1) return res.status(400).json({ message: "You are not a member of this group" });

    const isAdmin = group.members[memberIndex].role === "admin";
    const adminCount = group.members.filter((member) => member.role === "admin").length;
    if (isAdmin && adminCount === 1 && group.members.length > 1) {
      return res.status(400).json({ message: "Cannot leave as the only admin. Please promote another member first." });
    }

    group.members.splice(memberIndex, 1);

    if (group.members.length === 0) {
      await Group.findByIdAndDelete(groupId);
      await Message.deleteMany({ group: groupId });
      return res.json({ success: true, message: "Left group successfully. Group was deleted as it had no members." });
    }

    await group.save();
    res.json({ success: true, message: "Left group successfully" });
  } catch (error) {
    console.error("Leave group error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Send a message within a group
const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content, tempId } = req.body;
    const senderId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group || !group.members.some(m => m.user.toString() === senderId)) {
      return res.status(403).json({ message: "You are not a member of this group." });
    }

    let message = await Message.create({ sender: senderId, group: groupId, content });
    message = await message.populate("sender", "name profilePhotoUrl");

    req.app.get('io').to(groupId).emit('receive-group-message', { ...message.toObject(), tempId });

    res.status(201).json({ success: true, message });
  } catch (error) {
    console.error("Send group message error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all messages for a specific group
const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const messages = await Message.find({ group: groupId })
      .populate("sender", "name profilePhotoUrl")
      .sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    console.error("Get group messages error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// --- Admin-Only Functions ---

const checkAdmin = (group, userId) => {
    const member = group.members.find(m => m.user.toString() === userId.toString());
    return member && member.role === 'admin';
};

const addMember = async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (!checkAdmin(group, req.user.id)) return res.status(403).json({ message: "Only admins can add members" });
        if (group.members.some(m => m.user.toString() === userId)) return res.status(400).json({ message: "User is already a member" });
        
        group.members.push({ user: userId, role: "member", joinedAt: new Date() });
        await group.save();
        res.json({ success: true, message: "Member added successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

const removeMember = async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (!checkAdmin(group, req.user.id)) return res.status(403).json({ message: "Only admins can remove members" });

        const memberIndex = group.members.findIndex(m => m.user.toString() === userId);
        if (memberIndex === -1) return res.status(404).json({ message: "Member not found in group" });
        
        group.members.splice(memberIndex, 1);
        await group.save();
        res.json({ success: true, message: "Member removed successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

const updateMemberRole = async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        const { role } = req.body;
        if (!['admin', 'member'].includes(role)) return res.status(400).json({ message: "Invalid role specified" });

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (!checkAdmin(group, req.user.id)) return res.status(403).json({ message: "Only admins can change roles" });

        const member = group.members.find(m => m.user.toString() === userId);
        if (!member) return res.status(404).json({ message: "Member not found" });

        member.role = role;
        await group.save();
        res.json({ success: true, message: "Member role updated" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

const updateGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, description, isPrivate } = req.body;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (!checkAdmin(group, req.user.id)) return res.status(403).json({ message: "Only admins can update group details" });
        
        if (name) group.name = name;
        if (description) group.description = description;
        if (isPrivate !== undefined) group.isPrivate = isPrivate;
        
        await group.save();
        res.json({ success: true, message: "Group updated successfully", group });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

const deleteGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (group.createdBy.toString() !== req.user.id) return res.status(403).json({ message: "Only the group creator can delete the group" });

        await Group.findByIdAndDelete(groupId);
        await Message.deleteMany({ group: groupId }); // Clean up messages

        res.json({ success: true, message: "Group deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
  createGroup,
  getMyGroups,
  discoverPublicGroups,
  getGroupById,
  joinGroup,
  leaveGroup,
  sendGroupMessage,
  getGroupMessages,
  addMember,
  removeMember,
  updateMemberRole,
  updateGroup,
  deleteGroup,
};