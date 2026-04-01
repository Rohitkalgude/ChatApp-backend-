import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
   {
      senderId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
      receiverId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
      text: {
         type: String,
      },
      media: {
         url: {
            type: String,
            default: "",
         },
         type: {
            type: String,
            enum: ["image", "video", "audio", "file"],
            default: null,
         },
         name: { type: String, default: "" },
      },
      seen: {
         type: Boolean,
         default: false
      }
   },
   { timestamps: true }
);

export const Message = mongoose.model("Message", messageSchema);
