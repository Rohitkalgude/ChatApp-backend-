import path from "path";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import ConnectDB from "./src/config/db.js";
import authrouter from "./src/routes/auth.route.js";
import Messagerouter from "./src/routes/Message.route.js";
import { app, server } from "./src/lib/socket.js";

dotenv.config();
ConnectDB();

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(
   cors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
   })
);

app.use("/api/v1/auth", authrouter);
app.use("/api/v1/message", Messagerouter);

app.get("/", (req, res) => {
   res.send("hello server");
});

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
   console.log(`Server running on http://localhost:${PORT}`);
});
