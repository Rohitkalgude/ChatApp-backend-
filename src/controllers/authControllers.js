import fs from "fs";
import { User } from "../models/User.js";
import { transporter } from "../services/nodemailer.js";
import responseHandler from "../services/responseHandler.js";

const Register = async (req, res) => {
   try {
      const { fullName, email, password } = req.body;

      if (!fullName || !email || !password) {
         return responseHandler(res, 400, false, "All fields are required");
      }

      const existingUser = await User.findOne({ email });

      if (existingUser) {
         return responseHandler(res, 400, false, "User already exists");
      }

      const emailOtp = Math.floor(100000 + Math.random() * 900000);
      const emailOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      const newUser = await User.create({
         fullName,
         email,
         password,
         emailOtp,
         emailOtpExpiry,
      });

      transporter
         .sendMail({
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: `Welcome to ChatApp - Verify Your Account`,
            text: `🎉 Welcome ${fullName}!\n\nYour account has been created successfully.\n\nYour OTP for verification is: ${emailOtp}\n\nThis OTP is valid for 10 minutes.\n\nThank you for joining ChatApp 💬`,
         })
         .catch((err) => console.log("Email error:", err.message));

      return responseHandler(
         res,
         201,
         true,
         "User registered successfully, OTP sent to email",
         {
            user: {
               _id: newUser._id,
               fullName: newUser.fullName,
               email: newUser.email,
            },
         }
      );
   } catch (error) {
      console.log("Error in user registration:", error.message);
      return responseHandler(res, 500, false, error.message);
   }
};

const verifyOtp = async (req, res) => {
   try {
      const { emailOtp } = req.body;

      if (!emailOtp) {
         return responseHandler(res, 400, false, "Email and OTP required");
      }

      const user = await User.findOne({ emailOtp: Number(emailOtp) });

      if (!user) {
         return responseHandler(res, 404, false, "Invalid OTP");
      }

      if (user.isverified) {
         return responseHandler(res, 400, false, "User already verified");
      }

      if (user.emailOtp !== Number(emailOtp)) {
         return responseHandler(res, 400, false, "Invalid OTP");
      }

      if (user.emailOtpExpiry < new Date()) {
         return responseHandler(res, 400, false, "OTP expired");
      }

      user.isverified = true;
      user.emailOtp = null;
      user.emailOtpExpiry = null;
      await user.save();

      const token = user.generateToken();

      return responseHandler(res, 200, true, "OTP verified", { user, token });
   } catch (error) {
      console.log("Error in user verifyOtp:", error.message);
      return responseHandler(res, 500, false, "Server error");
   }
};

const Login = async (req, res) => {
   try {
      const { email, password } = req.body;

      if (!email || !password) {
         return responseHandler(res, 400, false, "All fields are required");
      }

      const user = await User.findOne({ email });
      if (!user) {
         return responseHandler(res, 404, false, "User not found");
      }

      const isMatch = await user.isPasswordCorrect(password);
      if (!isMatch) {
         return responseHandler(res, 401, false, "Wrong password");
      }

      const token = user.generateToken();
      console.log("generateToken", token);

      res.cookie("accessToken", token, {
         httpOnly: true,
         secure: false,
         sameSite: "lax",
      });

      return responseHandler(res, 200, true, "Login successful", {
         token,
         user,
      });
   } catch (error) {
      console.log("Error in user Login:", error.message);
      return responseHandler(res, 500, false, "Server error");
   }
};

const resendOtp = async (req, res) => {
   try {
      const { email } = req.body;

      if (!email) {
         return responseHandler(res, 400, false, "Email is required");
      }

      const user = await User.findOne({ email });

      if (!user) {
         return responseHandler(res, 404, false, "User not found");
      }

      if (user.isverified) {
         return responseHandler(res, 400, false, "User already verified");
      }

      const emailOtp = Math.floor(100000 + Math.random() * 900000);
      const emailOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      user.emailOtp = emailOtp;
      user.emailOtpExpiry = emailOtpExpiry;

      await user.save();

      transporter
         .sendMail({
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: "Resend OTP - ChatApp Verification",
            text: `Your new OTP is: ${emailOtp}. It will expire in 10 minutes.`,
         })
         .catch((err) => console.log("Email error:", err.message));

      return responseHandler(res, 200, true, "OTP resent successfully");
   } catch (error) {
      console.log("Error in user resendOtp:", error.message);
      return responseHandler(res, 500, false, "Server error");
   }
};

const CurrentUser = async (req, res) => {
   try {
      if (!req.user) {
         return responseHandler(res, 401, false, "Not authorized");
      }
      return responseHandler(res, 200, true, "Current user fetched", req.user);
   } catch (error) {
      console.log("Error in user currentUser:", error.message);
      return responseHandler(res, 500, false, "Server error");
   }
};

const Logout = async (req, res) => {
   try {
      res.clearCookie("accessToken", {
         httpOnly: true,
         secure: process.env.NODE_ENV === "production",
         sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });

      return responseHandler(res, 200, true, "Logout successful");
   } catch (error) {
      console.log("Error in user Logout:", error.message);
      return responseHandler(res, 500, false, "Server error");
   }
};

const requestPasswordReset = async (req, res) => {
   try {
      const { email } = req.body;

      if (!email) {
         return responseHandler(res, 400, false, "Email is required");
      }

      const user = await User.findOne({ email });

      if (!user) {
         return responseHandler(res, 404, false, "User not found");
      }

      const emailOtp = Math.floor(100000 + Math.random() * 900000);
      const emailOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      user.emailOtp = emailOtp;
      user.emailOtpExpiry = emailOtpExpiry;
      await user.save();

      const mailOptions = {
         from: process.env.SENDER_EMAIL,
         to: email,
         subject: "ChatApp - Password Reset OTP",
         text: `Hello ${user.fullName || ""},\n\nYou requested to reset your password.\n\nYour OTP is: ${emailOtp}\nThis OTP is valid for 5 minutes.\n\nIf you didn't request this, please ignore this email.`,
      };

      await transporter.sendMail(mailOptions);

      return responseHandler(res, 200, true, "OTP sent to email", {
         email: user.email,
         fullName: user.fullName,
      });
   } catch (error) {
      console.log("Error in user requestPasswordReset:", error.message);
      return responseHandler(res, 500, false, "Server error");
   }
};

const passwordOtp = async (req, res) => {
   try {
      const { emailOtp } = req.body;

      if (!emailOtp) {
         return responseHandler(res, 400, false, "OTP is required");
      }

      const user = await User.findOne({ emailOtp });

      if (!user) {
         return responseHandler(res, 404, false, "User not found");
      }

      if (
         user.emailOtp !== Number(emailOtp) ||
         user.emailOtpExpiry < new Date()
      ) {
         return responseHandler(res, 400, false, "Invalid or expired OTP");
      }

      const resetToken = user.generateToken();

      return responseHandler(res, 200, true, "OTP verified", {
         email: user.email,
         resetToken,
      });
   } catch (error) {
      console.log("Error in user passwordOtp:", error.message);
      return responseHandler(res, 500, false, "Server error");
   }
};

const NewPassword = async (req, res) => {
   try {
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
         return responseHandler(
            res,
            400,
            false,
            "Email and new password are required"
         );
      }

      const user = await User.findOne({ email });

      if (!user) {
         return responseHandler(res, 404, false, "User not found");
      }

      user.password = newPassword;
      user.emailOtp = null;
      user.emailOtpExpiry = null;

      await user.save();

      return responseHandler(res, 200, true, "Password changed successfully");
   } catch (error) {
      console.log("Error in user NewPassword:", error.message);
      return responseHandler(res, 500, false, "Server error");
   }
};

const updateProfile = async (req, res) => {
   try {
      const { fullName, bio, profilePic } = req.body;
      const userId = req.user?._id;

      if (!userId) {
         return responseHandler(res, 401, false, "Unauthorized");
      }

      const user = await User
         .findById(userId);

      if (!user) {
         return responseHandler(res, 404, false, "User not found");
      }
      let updatedData = { fullName, bio };

      if (req.file) {
         // Delete old image if it exists and is a local file
         if (user.profilePic && user.profilePic.startsWith("/uploads/")) {
            const oldImagePath = user.profilePic.replace("/uploads/", "uploads/");
            if (fs.existsSync(oldImagePath)) {
               try {
                  fs.unlinkSync(oldImagePath);
               } catch (err) {
                  console.error("Error deleting old profile image:", err.message);
               }
            }
         }
         updatedData.profilePic = `/uploads/${req.file.filename}`;
      } else if (profilePic) {
         updatedData.profilePic = profilePic;
      }

      const updatedUser = await User.findByIdAndUpdate(userId, updatedData, {
         new: true,
      });

      return responseHandler(res, 200, true, "Profile updated", updatedUser);
   } catch (error) {
      console.log("Error in user updateProfile:", error.message);
      return responseHandler(res, 500, false, "Server error");
   }
};

export {
   Register,
   verifyOtp,
   Login,
   resendOtp,
   CurrentUser,
   Logout,
   requestPasswordReset,
   passwordOtp,
   NewPassword,
   updateProfile,
};
