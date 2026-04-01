import mongoose from "mongoose";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
   fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
   },
   email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: {
         validator: function (email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
         },
         message: "Invalid email address format",
      },
   },
   password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
   },
   profilePic: { type: String, default: "" },
   bio: { type: String },
   emailOtp: { type: Number, default: null, index: true },
   emailOtpExpiry: { type: Date, default: null },
   isverified: { type: Boolean, default: false },
});

userSchema.pre("save", async function () {
   if (!this.isModified("password")) return;
   this.password = await bcryptjs.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function (password) {
   return await bcryptjs.compare(password, this.password);
};

userSchema.methods.generateToken = function () {
   return jwt.sign(
      {
         _id: this._id,
         email: this.email,
         fullName: this.fullName,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
   );
};

export const User = mongoose.model("User", userSchema);
