import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
   cors: {
      origin: [process.env.FRONTEND_URL],
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      credentials: true,
   },
});

export const userScoketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
   const userId = socket.handshake.query.userId;
   if (userId) {
      userScoketMap[userId] = socket.id;
      console.log("User Connected", userId);
   }

   // Emit online users to all connected clients
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

export { app, io, server };
