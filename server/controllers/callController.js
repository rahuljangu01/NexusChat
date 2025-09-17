// server/controllers/callController.js (FINAL & PERMANENT FIX)

const CallRecord = require("../models/CallRecord");
const Group = require("../models/Group");

exports.logCall = async (req, res) => {
  try {
    const { receiverId, groupId, status, duration } = req.body;
    const callerId = req.user.id;

    // --- PERMANENT FIX FOR DUPLICATES ---
    // Check if a similar call was logged in the last 5 seconds.
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    
    let existingCall;
    if (receiverId) { // For one-on-one calls
      existingCall = await CallRecord.findOne({
        users: { $all: [callerId, receiverId] },
        createdAt: { $gte: fiveSecondsAgo }
      });
    } else if (groupId) { // For group calls
      existingCall = await CallRecord.findOne({
        group: groupId,
        caller: callerId,
        createdAt: { $gte: fiveSecondsAgo }
      });
    }

    // If a recent call exists, do not log a new one.
    if (existingCall) {
      return res.status(200).json({ success: true, message: "Call already logged.", call: existingCall });
    }
    // --- END OF FIX ---

    let newCall;

    if (receiverId) {
      // Logic for one-on-one call
      newCall = await CallRecord.create({
        caller: callerId,
        receiver: receiverId,
        users: [callerId, receiverId],
        callType: 'one-on-one',
        status,
        duration: duration || 0,
      });
    } else if (groupId) {
      // Logic for group call
      const group = await Group.findById(groupId).lean();
      if (!group) {
        return res.status(404).json({ message: "Group not found." });
      }

      newCall = await CallRecord.create({
        caller: callerId,
        group: groupId,
        users: group.members.map(m => m.user),
        callType: 'group',
        status,
        duration: duration || 0,
      });
    } else {
      return res.status(400).json({ message: "Receiver ID or Group ID is required." });
    }

    res.status(201).json({ success: true, call: newCall });
  } catch (error) {
    console.error("Error logging call:", error);
    res.status(500).json({ message: "Server error while logging call." });
  }
};

exports.getCallHistory = async (req, res) => {
  try {
    const history = await CallRecord.find({ users: req.user.id })
      .populate("caller", "name profilePhotoUrl")
      .populate("receiver", "name profilePhotoUrl")
      .populate("group", "name avatar")
      .sort({ createdAt: -1 });
      
    res.status(200).json({ success: true, history });
  } catch (error) {
    console.error("Error fetching call history:", error);
    res.status(500).json({ message: "Server error while fetching history." });
  }
};

exports.deleteCallRecord = async (req, res) => {
  try {
    const { callId } = req.params;
    const result = await CallRecord.findOneAndDelete({ _id: callId, users: req.user.id });
    if (!result) {
      return res.status(404).json({ message: "Call record not found or you are not authorized." });
    }
    res.status(200).json({ success: true, message: "Call record deleted." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

exports.clearCallHistory = async (req, res) => {
  try {
    await CallRecord.deleteMany({ users: req.user.id });
    res.status(200).json({ success: true, message: "Call history cleared." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};