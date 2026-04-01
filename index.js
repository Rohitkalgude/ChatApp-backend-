import express from "express";
import path from "path";

import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import ConnectDB from "./src/config/db.js";
import authrouter from "./src/routes/auth.route.js";
import Messagerouter from "./src/routes/Message.route.js";

dotenv.config();
ConnectDB();

//create express server and HTTP server
const app = express();
const server = http.createServer(app);

//initialize socket.io server
export const io = new Server(server, {
   cors: {
      origin: process.env.FRONTEND_URL,
      methods: ["GET", "POST"],
      credentials: true,
   },
});

//Store online User
export const userScoketMap = {};

io.on("connection", (socket) => {
   // server se client ko (single)
   const userId = socket.handshake.query.userId;
   console.log("User Connected", userId);

   if (userId) userScoketMap[userId] = socket.id;

   //Emit online users to all connected clients
   io.emit("getOnlineUsers", Object.keys(userScoketMap));

   socket.on("typing", ({ to }) => {
      const targetSocket = userScoketMap[to];
      if (targetSocket) {
         io.to(targetSocket).emit("typing", { from: userId });
      }
   });

   socket.on("stopTyping", ({ to }) => {
      const targetSocket = userScoketMap[to];
      if (targetSocket) {
         io.to(targetSocket).emit("stopTyping", { from: userId });
      }
   });

   socket.on("disconnect", () => {
      console.log("User Disconnected", userId);
      delete userScoketMap[userId];
      io.emit("getOnlineUsers", Object.keys(userScoketMap));
   });
});

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

const PORT = process.env.PORT || 7000;

server.listen(PORT, () => {
   console.log(`Server running on http://localhost:${PORT}`);
});
