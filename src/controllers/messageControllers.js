import mongoose from "mongoose";
import fs from "fs";

import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import { io, userScoketMap } from "../lib/socket.js";

const getAlluser = async (req, res) => {
   try {
      const loggedInUserId = req.user?._id;

      if (!loggedInUserId) {
         return res
            .status(401)
            .json({ success: false, message: "Unauthorized" });
      }

      const users = await User.find({ _id: { $ne: loggedInUserId } }).select(
         "-password"
      );

      //Count number of message not seen

      const unseensMessage = {};
      const promises = users.map(async (user) => {
         const messages = await Message.find({
            senderId: user._id,
            receiverId: loggedInUserId,
            seen: false,
         });

         if (messages.length > 0) {
            unseensMessage[user._id] = messages.length;
         }
      });

      await Promise.all(promises);

      return res.status(200).json({
         success: true,
         message: "All users fetched successfully",
         users,
         unseensMessage,
      });
   } catch (error) {
      console.log("User fetching error", error.message);
      return res.status(500).json({ success: false, message: "server error" });
   }
};

const sendMessage = async (req, res) => {
   try {
      const { text, image } = req.body;
      const receiverId = req.params.id;
      const senderId = req.user?._id;

      let media = null;

      if (req.file) {
         let type = "file";
         if (req.file.mimetype.startsWith("image/")) type = "image";
         else if (req.file.mimetype.startsWith("video/")) type = "video";
         else if (req.file.mimetype.startsWith("audio/")) type = "audio";

         media = {
            url: `/uploads/${req.file.filename}`,
            type: type,
            name: req.file.originalname,
         };
      }

      const newMessage = await Message.create({
         senderId,
         receiverId,
         text,
         media,
      });

      // Send message instantly using Socket.io
      const receiverSocketId = userScoketMap[receiverId];

      if (receiverSocketId) {
         io.to(receiverSocketId).emit("newMessage", newMessage);
      }

      return res.status(201).json({
         success: true,
         message: "message send succefully",
         newMessage,
      });
   } catch (error) {
      console.log("sending time error", error.message);
      return res.status(500).json({ success: false, message: "Server error" });
   }
};

const getMessage = async (req, res) => {
   try {
      const { selectedUserID } = req.params;
      const loggedInUserId = req.user._id;

      const messages = await Message.find({
         $or: [
            { senderId: loggedInUserId, receiverId: selectedUserID },
            { senderId: selectedUserID, receiverId: loggedInUserId },
         ],
      }).sort({ createdAt: 1 });

      // Mark unread messages as seen
      await Message.updateMany(
         { senderId: selectedUserID, receiverId: loggedInUserId },
         { seen: true }
      );

      return res.status(200).json({
         success: true,
         message: "Messages fetched successfully",
         messages,
      });
   } catch (error) {
      console.log("message fetching error", error.message);
      return res.status(500).json({ success: false, message: "server error" });
   }
};

const markRead = async (req, res) => {
   try {
      const { selectedUserID } = req.params;
      const loggedInUserId = req.user?._id;

      const result = await Message.updateMany(
         {
            senderId: selectedUserID,
            receiverId: loggedInUserId,
            seen: false,
         },
         { $set: { seen: true } }
      );

      const socketId = userScoketMap[selectedUserID];
      if (socketId) {
         io.to(socketId).emit("messagesSeen", { userId: loggedInUserId });
      }

      return res.status(200).json({
         success: true,
         message: "Messages marked as read",
         updatedCount: result.modifiedCount,
      });
   } catch (error) {
      console.log("Mark read error", error.message);
      return res.status(500).json({ success: false, message: "server error" });
   }
};

const deleteMessage = async (req, res) => {
   try {
      const { messageId } = req.body;
      const userId = req.user._id;

      const message = await Message.findById(messageId);

      if (!message) {
         return res
            .status(400)
            .json({ success: false, message: " message not found " });
      }

      if (message.senderId.toString() !== userId.toString()) {
         return res.status(403).json({
            success: false,
            message: "You are not allowed to delete this message",
         });
      }

      if (message.media?.url && message.media.url.startsWith("/uploads/")) {
         const filePath = message.media.url.replace("/uploads/", "uploads/");
         if (fs.existsSync(filePath)) {
            try {
               fs.unlinkSync(filePath);
            } catch (err) {
               console.error("Error deleting message file:", err.message);
            }
         }
      }

      await message.deleteOne();

      const receiverId = message.receiverId;
      const receiverSocketId = userScoketMap[receiverId];

      if (receiverSocketId) {
         io.to(receiverSocketId).emit("messageDeleted", messageId);
      }

      return res
         .status(200)
         .json({ success: true, message: "Message delete successfully" });
   } catch (error) {
      console.log("Delete error", error.message);
      return res.status(500).json({ success: false, message: "server error" });
   }
};

export { getAlluser, sendMessage, getMessage, markRead, deleteMessage };
