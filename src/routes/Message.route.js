import express from "express";
import {
   deleteMessage,
   getAlluser,
   getMessage,
   markRead,
   sendMessage,
} from "../controllers/messageControllers.js";
import { VerifyJwt } from "../middlewares/authmiddlewares.js";
import { upload } from "../services/multer.js";


const router = express.Router();

router.get("/allusers", VerifyJwt, getAlluser);
router.post("/sendmessage/:id", VerifyJwt, upload.single("image"), sendMessage);

router.get("/:selectedUserID", VerifyJwt, getMessage);
router.put("/markread/:selectedUserID", VerifyJwt, markRead);
router.delete("/delete", VerifyJwt, deleteMessage);

export default router;
