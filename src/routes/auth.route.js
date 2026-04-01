import express from "express";
import {
   CurrentUser,
   Login,
   Logout,
   NewPassword,
   passwordOtp,
   Register,
   requestPasswordReset,
   resendOtp,
   updateProfile,
   verifyOtp,
} from "../controllers/authControllers.js";
import { VerifyJwt } from "../middlewares/authmiddlewares.js";
import { upload } from "../services/multer.js";


const router = express.Router();

router.post("/register", Register);
router.post("/verfiyOpt", verifyOtp);
router.post("/resendOtp", resendOtp);
router.post("/login", Login);
router.get("/currentuser", VerifyJwt, CurrentUser);
router.post("/logout", Logout);
router.post("/requestPasswordReset", requestPasswordReset);
router.post("/verifyPasswordOtp", passwordOtp);
router.post("/newPassword", NewPassword);
router.put("/updateProfile", VerifyJwt, upload.single("profilePic"), updateProfile);


export default router;
